import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { Console } from './Utils/Console.js';

import { SberBank } from './Banks/Sberbank/SberBank.js';

const port = 3000;
const app = new Hono();

app.get('/', (c) => {

  Console.log("[+] New connect");

  return c.text('Please indicate the correct parameters');
  
});

app.get('/payments', async  (c) => {

  let proxy = {login:'', pass: '', ip: '', port: ''}

  let s = new SberBank('PkGmjkYrK84Jdf6','Supreme01sperman--F-F-f','12121212', '11', 173207352054090900093, proxy);
  await s.payment()
  return c.json({page: 'payments'});
});

app.get('/pay', (c) => { return c.json({page: 'payments'}); });

app.get('/daemon', (c) => {

  /*
  *** only test 
  */
  return c.json({page: 'payments'});
});



app.get('t')



Console.log(`Server is running on http://localhost:${port}`);



serve({
  fetch: app.fetch,
  port
});



 /*
  let sim800c = new Sim800c('/dev/ttyUSB0', 9600);

  await sim800c.openPortSim800c()

  let res: string = await sim800c.test("AT\r");

  await sim800c.closePortSim800c();

  */