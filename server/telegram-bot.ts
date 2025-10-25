import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { DEPARTMENTS, IT_DEPARTMENT, type Department } from "@shared/schema";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// User state management
interface UserState {
  step: 'awaiting_text' | 'awaiting_departments' | 'awaiting_confirmation';
  postText?: string;
  selectedDepartments?: string[];
}

const userStates = new Map<string, UserState>();

// Welcome message text
const WELCOME_MESSAGE = `👋 Добро пожаловать в систему корпоративных уведомлений!

Этот бот создан для информирования сотрудников компании о важных событиях и технических работах.

Когда происходит что-то важное (например, технические проблемы с сервером), администраторы бота отправляют уведомление всем сотрудникам или определенным отделам.

📌 Чтобы начать, выберите ваш отдел из списка ниже:`;

// Department selection keyboard
function getDepartmentKeyboard() {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
  
  // Create rows with 1 button each for better readability
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    keyboard.push([
      {
        text: DEPARTMENTS[i],
        callback_data: `dept_${i}`,
      },
    ]);
  }
  
  return {
    inline_keyboard: keyboard,
  };
}

// Admin menu keyboard
function getAdminKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "➕ Создать пост",
          callback_data: "create_post",
        },
      ],
      [
        {
          text: "🔄 Изменить отдел",
          callback_data: "change_department",
        },
      ],
    ],
  };
}

// Regular user keyboard
function getUserKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "🔄 Изменить отдел",
          callback_data: "change_department",
        },
      ],
    ],
  };
}

// Get department selection keyboard with checkboxes for post creation
function getPostDepartmentKeyboard(selectedDepartments: string[] = []) {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
  
  // Add department buttons with checkmarks for selected ones
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const dept = DEPARTMENTS[i];
    const isSelected = selectedDepartments.includes(dept);
    keyboard.push([
      {
        text: `${isSelected ? '✅' : '☐'} ${dept}`,
        callback_data: `toggle_dept_${i}`,
      },
    ]);
  }
  
  // Add "Select All" / "Deselect All" button
  const allSelected = selectedDepartments.length === DEPARTMENTS.length;
  keyboard.push([
    {
      text: allSelected ? "❌ Снять все" : "✅ Выбрать все",
      callback_data: "toggle_all_depts",
    },
  ]);
  
  // Add Done button (only if at least one department is selected)
  if (selectedDepartments.length > 0) {
    keyboard.push([
      {
        text: `✔️ Готово (${selectedDepartments.length})`,
        callback_data: "done_selecting_depts",
      },
    ]);
  }
  
  // Add Cancel button
  keyboard.push([
    {
      text: "❌ Отменить",
      callback_data: "cancel_post",
    },
  ]);
  
  return {
    inline_keyboard: keyboard,
  };
}

// Get confirmation keyboard
function getConfirmationKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "✅ Опубликовать",
          callback_data: "confirm_publish",
        },
      ],
      [
        {
          text: "❌ Отменить",
          callback_data: "cancel_post",
        },
      ],
    ],
  };
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  
  if (!telegramId) return;
  
  try {
    // Check if user exists
    const existingUser = await storage.getTelegramUserByTelegramId(telegramId);
    
    if (existingUser && existingUser.department) {
      // User already registered
      const keyboard = existingUser.isAdmin ? getAdminKeyboard() : getUserKeyboard();
      
      await bot.sendMessage(
        chatId,
        `Добро пожаловать обратно, ${msg.from?.first_name}!\n\n` +
        `Ваш отдел: ${existingUser.department}\n` +
        (existingUser.isAdmin ? `Статус: Администратор\n\n` : `\n`) +
        `Вы будете получать уведомления, адресованные вашему отделу.`,
        { reply_markup: keyboard }
      );
    } else {
      // New user - show welcome and department selection
      await bot.sendMessage(chatId, WELCOME_MESSAGE, {
        reply_markup: getDepartmentKeyboard(),
      });
    }
  } catch (error) {
    console.error("Error in /start command:", error);
    await bot.sendMessage(
      chatId,
      "Произошла ошибка. Попробуйте позже или обратитесь в IT-отдел."
    );
  }
});

// Handle text messages (for post creation)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const text = msg.text;
  
  if (!telegramId || !text) return;
  
  // Ignore commands
  if (text.startsWith('/')) return;
  
  try {
    const userState = userStates.get(telegramId);
    
    if (userState && userState.step === 'awaiting_text') {
      // Save post text and move to department selection
      userState.postText = text;
      userState.step = 'awaiting_departments';
      userState.selectedDepartments = [];
      
      await bot.sendMessage(
        chatId,
        `📝 Текст поста сохранен!\n\n` +
        `Теперь выберите отделы, которым нужно отправить это уведомление:`,
        { 
          reply_markup: getPostDepartmentKeyboard([])
        }
      );
    }
  } catch (error) {
    console.error("Error handling text message:", error);
    await bot.sendMessage(
      chatId,
      "Произошла ошибка. Попробуйте снова."
    );
  }
});

// Handle callback queries (button presses)
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  const telegramId = query.from.id.toString();
  const data = query.data;
  
  if (!chatId || !data) return;
  
  try {
    // Handle department selection (initial registration)
    if (data.startsWith("dept_") && !data.startsWith("toggle_dept_")) {
      const deptIndex = parseInt(data.split("_")[1]);
      const department = DEPARTMENTS[deptIndex];
      
      if (!department) {
        await bot.answerCallbackQuery(query.id, { text: "Ошибка выбора отдела" });
        return;
      }
      
      // Check if IT department for admin rights
      const isAdmin = department === IT_DEPARTMENT;
      
      // Check if user exists
      let user = await storage.getTelegramUserByTelegramId(telegramId);
      
      if (user) {
        // Update existing user
        await storage.updateTelegramUserDepartment(telegramId, department, isAdmin);
      } else {
        // Create new user
        await storage.createTelegramUser({
          telegramId,
          username: query.from.username,
          firstName: query.from.first_name,
          lastName: query.from.last_name,
          department,
          isAdmin,
        });
      }
      
      // Send confirmation
      const keyboard = isAdmin ? getAdminKeyboard() : getUserKeyboard();
      
      await bot.editMessageText(
        `✅ Отлично!\n\n` +
        `Ваш отдел: ${department}\n` +
        (isAdmin ? `Статус: Администратор\n\n` : `\n`) +
        `Вы будете получать уведомления, адресованные вашему отделу.` +
        (isAdmin ? `\n\nКак администратор, вы можете создавать уведомления для других отделов.` : ``),
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
          reply_markup: keyboard,
        }
      );
      
      await bot.answerCallbackQuery(query.id, {
        text: `Выбран отдел: ${department}`,
      });
    }
    
    // Handle change department
    else if (data === "change_department") {
      await bot.editMessageText(
        "Выберите новый отдел:",
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
          reply_markup: getDepartmentKeyboard(),
        }
      );
      
      await bot.answerCallbackQuery(query.id);
    }
    
    // Handle create post
    else if (data === "create_post") {
      // Check if user is admin
      const user = await storage.getTelegramUserByTelegramId(telegramId);
      
      if (!user || !user.isAdmin) {
        await bot.answerCallbackQuery(query.id, {
          text: "У вас нет прав для создания постов",
          show_alert: true,
        });
        return;
      }
      
      // Set user state to awaiting text
      userStates.set(telegramId, {
        step: 'awaiting_text',
      });
      
      await bot.sendMessage(
        chatId,
        `📝 Отправьте текст уведомления, которое хотите разместить.\n\n` +
        `Можете использовать несколько строк. После отправки вы сможете выбрать отделы.`
      );
      
      await bot.answerCallbackQuery(query.id);
    }
    
    // Handle toggle department for post
    else if (data.startsWith("toggle_dept_")) {
      const userState = userStates.get(telegramId);
      
      if (!userState || userState.step !== 'awaiting_departments') {
        await bot.answerCallbackQuery(query.id, {
          text: "Сессия истекла. Начните создание поста заново.",
        });
        return;
      }
      
      const deptIndex = parseInt(data.split("_")[2]);
      const department = DEPARTMENTS[deptIndex];
      
      if (!department) {
        await bot.answerCallbackQuery(query.id, { text: "Ошибка" });
        return;
      }
      
      // Toggle department selection
      const selected = userState.selectedDepartments || [];
      const index = selected.indexOf(department);
      
      if (index > -1) {
        selected.splice(index, 1);
      } else {
        selected.push(department);
      }
      
      userState.selectedDepartments = selected;
      
      // Update keyboard
      await bot.editMessageReplyMarkup(
        getPostDepartmentKeyboard(selected),
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
        }
      );
      
      await bot.answerCallbackQuery(query.id, {
        text: index > -1 ? `Убран: ${department}` : `Выбран: ${department}`,
      });
    }
    
    // Handle toggle all departments
    else if (data === "toggle_all_depts") {
      const userState = userStates.get(telegramId);
      
      if (!userState || userState.step !== 'awaiting_departments') {
        await bot.answerCallbackQuery(query.id, {
          text: "Сессия истекла. Начните создание поста заново.",
        });
        return;
      }
      
      const selected = userState.selectedDepartments || [];
      const allSelected = selected.length === DEPARTMENTS.length;
      
      if (allSelected) {
        userState.selectedDepartments = [];
      } else {
        userState.selectedDepartments = [...DEPARTMENTS];
      }
      
      // Update keyboard
      await bot.editMessageReplyMarkup(
        getPostDepartmentKeyboard(userState.selectedDepartments),
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
        }
      );
      
      await bot.answerCallbackQuery(query.id, {
        text: allSelected ? "Все отделы сняты" : "Все отделы выбраны",
      });
    }
    
    // Handle done selecting departments
    else if (data === "done_selecting_depts") {
      const userState = userStates.get(telegramId);
      
      if (!userState || userState.step !== 'awaiting_departments' || !userState.postText) {
        await bot.answerCallbackQuery(query.id, {
          text: "Сессия истекла. Начните создание поста заново.",
        });
        return;
      }
      
      const selected = userState.selectedDepartments || [];
      
      if (selected.length === 0) {
        await bot.answerCallbackQuery(query.id, {
          text: "Выберите хотя бы один отдел",
          show_alert: true,
        });
        return;
      }
      
      // Move to confirmation step
      userState.step = 'awaiting_confirmation';
      
      // Show confirmation
      const confirmationText = 
        `📢 Подтвердите публикацию:\n\n` +
        `📝 Текст:\n${userState.postText}\n\n` +
        `👥 Отделы (${selected.length}):\n` +
        selected.map(d => `• ${d}`).join('\n') + '\n\n' +
        `Отправить уведомление?`;
      
      await bot.editMessageText(
        confirmationText,
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
          reply_markup: getConfirmationKeyboard(),
        }
      );
      
      await bot.answerCallbackQuery(query.id);
    }
    
    // Handle confirm publish
    else if (data === "confirm_publish") {
      const userState = userStates.get(telegramId);
      
      if (!userState || userState.step !== 'awaiting_confirmation' || !userState.postText) {
        await bot.answerCallbackQuery(query.id, {
          text: "Сессия истекла. Начните создание поста заново.",
        });
        return;
      }
      
      const selected = userState.selectedDepartments || [];
      
      // Save notification to database
      await storage.createNotification({
        message: userState.postText,
        departments: selected,
      });
      
      // Send notifications to users
      const result = await sendNotificationToUsers(userState.postText, selected);
      
      // Clear user state
      userStates.delete(telegramId);
      
      // Edit confirmation message to remove buttons
      await bot.editMessageText(
        `✅ Уведомление опубликовано!\n\n` +
        `📊 Статистика:\n` +
        `✅ Отправлено: ${result.sent}\n` +
        `❌ Ошибок: ${result.failed}\n\n` +
        `👥 Отделы: ${selected.join(', ')}`,
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
        }
      );
      
      // Send new message with admin menu
      await bot.sendMessage(
        chatId,
        `Выберите действие:`,
        {
          reply_markup: getAdminKeyboard(),
        }
      );
      
      await bot.answerCallbackQuery(query.id, {
        text: "Уведомление опубликовано!",
      });
    }
    
    // Handle cancel post
    else if (data === "cancel_post") {
      // Clear user state
      userStates.delete(telegramId);
      
      // Edit message to remove buttons
      await bot.editMessageText(
        `❌ Создание поста отменено.`,
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
        }
      );
      
      // Send new message with admin menu
      await bot.sendMessage(
        chatId,
        `Выберите действие:`,
        {
          reply_markup: getAdminKeyboard(),
        }
      );
      
      await bot.answerCallbackQuery(query.id, {
        text: "Отменено",
      });
    }
  } catch (error) {
    console.error("Error in callback query:", error);
    await bot.answerCallbackQuery(query.id, {
      text: "Произошла ошибка. Попробуйте снова.",
    });
  }
});

// Function to send notification to users
export async function sendNotificationToUsers(
  message: string,
  departments: string[]
): Promise<{ sent: number; failed: number }> {
  try {
    // Get all users from specified departments
    const users = await storage.getTelegramUsersByDepartments(departments);
    
    let sent = 0;
    let failed = 0;
    
    // Send message to each user
    for (const user of users) {
      try {
        await bot.sendMessage(
          user.telegramId,
          `📢 Новое уведомление\n\n${message}`,
          { parse_mode: "HTML" }
        );
        sent++;
      } catch (error) {
        console.error(`Failed to send to user ${user.telegramId}:`, error);
        failed++;
      }
    }
    
    return { sent, failed };
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw error;
  }
}

console.log("Telegram bot started successfully!");

export { bot };
