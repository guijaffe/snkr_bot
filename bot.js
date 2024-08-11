require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');

// Создаем экземпляр бота с вашим токеном
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Устанавливаем промежуточное ПО для сессий
bot.use(session());

// Для хранения данных о действиях пользователей
let userActions = {};

// Обработчик команды /start
bot.start((ctx) => {
  ctx.reply('Добро пожаловать! Выберите один из вариантов:',
    {
      reply_markup: {
        keyboard: [
          [{ text: 'Рассчитать заказ' }],
          [{ text: 'Инструкция по заказу' }],
        ],
        one_time_keyboard: true,
      },
    }
  );

  // Логируем действие пользователя
  logUserAction(ctx.from.id, 'start');
});

// Обработчик нажатия кнопки "Рассчитать заказ"
bot.hears('Рассчитать заказ', (ctx) => {
  ctx.reply('Пожалуйста, введите цену товара в юанях:');

  if (!ctx.session) ctx.session = {};
  ctx.session.waitingForPrice = true; // Устанавливаем флаг ожидания цены
  
  // Логируем действие пользователя
  logUserAction(ctx.from.id, 'calculate_order');
});

// Обработчик нажатия кнопки "Инструкция по заказу"
bot.hears('Инструкция по заказу', (ctx) => {
  const instructionMessage = `
<b>Инструкция по заказу через сайт Poizon (DW4)</b>

<b>1. Выбор размера:</b>
Перейдите на сайт Poizon (DW4) и выберите интересующую вас пару обуви. На странице товара найдите раздел с размерами. Убедитесь, что выбранный вами размер соответствует вашим требованиям. Если есть сомнения, ознакомьтесь с таблицей размеров на сайте, чтобы выбрать правильный размер.

<b>2. Выбор цены:</b>
После выбора размера обратите внимание на цену товара, которая указана на странице товара. Убедитесь, что цена отображается в юанях (CNY). Запишите цену для последующего ввода в бот.

<b>3. Ввод цены в боте:</b>
Вернитесь в чат с ботом и нажмите на кнопку 'Рассчитать заказ'. Бот попросит вас ввести цену товара в юанях. Введите цену и отправьте сообщение. Бот рассчитает итоговую цену в рублях и отправит вам результат.

<b>4. Проверка итоговой цены:</b>
Получите результат от бота. Итоговая цена будет отображена в рублях. Убедитесь, что расчет верен и соответствует вашим ожиданиям.

<b>Пример:</b>
Если цена на сайте Poizon составляет 1000 юаней, введите '1000' в боте. Бот рассчитает итоговую цену и отправит вам результат.
  `;

  ctx.replyWithHTML(instructionMessage);

  // Логируем действие пользователя
  logUserAction(ctx.from.id, 'instruction');
});

// Обработчик для получения цены товара
bot.on('text', (ctx) => {
  if (ctx.session && ctx.session.waitingForPrice) {
    const input = ctx.message.text.trim();
    const price = parseFloat(input);

    if (!isNaN(price)) {
      const calculatedPrice = (price * 14 + 2500).toFixed(2);
      ctx.reply(`Итоговая цена в рублях: ${calculatedPrice} ₽`);
    } else {
      ctx.reply('Пожалуйста, введите корректное число.');
    }

    ctx.session.waitingForPrice = false; // Сбрасываем флаг

    // Логируем действие пользователя
    logUserAction(ctx.from.id, `price_entered: ${input}`);
  }
});

// Функция для логирования действий пользователей
function logUserAction(userId, action) {
  const timestamp = new Date().toLocaleString();
  if (!userActions[userId]) {
    userActions[userId] = [];
  }
  userActions[userId].push({ action, timestamp });
}

// Запуск бота
bot.launch().then(() => {
  console.log('Бот запущен!');
});

// Обработка исключений и сигналов завершения
process.on('SIGINT', () => bot.stop('SIGINT'));
process.on('SIGTERM', () => bot.stop('SIGTERM'));

// Настройка Express сервера для отображения логов
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  let response = '<h1>Логи действий пользователей</h1><ul>';
  for (const [userId, actions] of Object.entries(userActions)) {
    response += `<li><strong>Пользователь ID ${userId}:</strong><ul>`;
    actions.forEach(action => {
      response += `<li>${action.timestamp}: ${action.action}</li>`;
    });
    response += '</ul></li>';
  }
  response += '</ul>';
  res.send(response);
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
