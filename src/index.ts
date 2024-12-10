
import { Hono } from 'hono';
import { serve } from '@hono/node-server'

/*
*** Utils
*/
import { Console } from './Utils/Console';

/*
*** Banks
*/
import { SberBank } from './Banks/Sberbank/SberBank';

/*
*** Tokens
*/

import { Token } from './Utils/Token';

import { SecretKey } from './Secure/SeckretKey';
import { password } from 'bun';
// import { Token } from './Token';



interface Proxy {
  login: string
  pass: string
  ip: string
  port: string
}

interface SberBank_RUB {
  login: string
  password: string
  amount: number
  proxy: Proxy
  timeout: number
  trx: string
  token: string
  session_uid: string
}

const app = new Hono();

app.get('/', async (c) => {

  Console.log("[+] New connect");

  return c.text('Please indicate the correct parameters');

});


/*
*** Microservice only SBERBANK (RUB)
*/
app.post('/micro/payments/sberbank_rub', async (c) => {

  const req: SberBank_RUB = await c.req.json();

  console.log(req);

  if (req.token) {

    const token: boolean = await Token.verify(req.token, SecretKey.secret_key_micro);

    console.log(`Token ${token}`)

    if (token) {

      console.log("start micro")

      let s = new SberBank(req.login, req.password, req.trx, req.amount, req.timeout, req.proxy, req.session_uid);

      s.payment()

      return c.json({status: 200});

    }

    return c.json({status: 500, message: "token in incorrect"});
  }

  return c.json({status: 400, message: "token not found"});

});

app.get('/withdraw', (c) => { return c.json({ page: 'payments' }); });

app.get('/daemon', (c) => {

  /*
  *** only test 
  */
  return c.json({ page: 'payments' });
});



app.get('/test', (c) => {

  /*
  *** only test 
  */

  const proxy = {login: '', password: '', ip: '', port: ''}
  let s = new SberBank("DFKodoisdf423", "parolinemenyautsaAFAXA_!369", "1212121212", 10, 99999999999999999999, proxy, "24787361-7cd4-5b93-a6fd-cfe95462904f");

  // s.payment()
  return c.json({ page: 'payments' });
});

const port = 3005;

Console.log(`Server is running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
