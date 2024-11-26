
import { Hono } from 'hono';
import { serve } from '@hono/node-server'
import { Console } from './Utils/Console';
import { SberBank } from './Banks/Sberbank/SberBank';


const app = new Hono();

app.get('/', async (c) => {

  Console.log("[+] New connect");

  return c.text('Please indicate the correct parameters');

});

app.get('/payments', async (c) => {

  let proxy = { login: '', pass: '', ip: '', port: '' }

  let s = new SberBank('PkGmjkYrK84Jdf6', 'Supreme01sperman--F-F-f', '12121212', '11', 173207352054090900093, proxy);
  await s.payment()
  return c.json({ page: 'payments' });


});

app.get('/pay', (c) => { return c.json({ page: 'payments' }); });

app.get('/daemon', (c) => {

  /*
  *** only test 
  */
  return c.json({ page: 'payments' });
});

export default app;

const port = 3002;

Console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
