export const sendTelegramMessage = async (text: string) => {
  const token = localStorage.getItem('tg_token');
  const chatId = localStorage.getItem('tg_chat_id');
  
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem para o Telegram:', error);
  }
};
