
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
import { SberBankTRX } from './Banks/Sberbank/SberBankTRX'
import { SberBankWithdraw } from './Banks/Sberbank/SberBankWithdraw';
import { SberBankAmount } from './Banks/Sberbank/SberBankAmount';

interface Proxy {
  login: string
  password: string
  ip: string
  port: string
}

interface SberBank_RUB {
  login: string
  password: string
  amount: number
  timeout: number
  trx: string
  token: string
  session_uid: string
}

interface SberBank_RUB_TRX {
  login: string
  password: string
  token: string
  session_uid: string
}

interface SberBankWithdrawRequest {
  login: string
  pass: string
  amount: number
  id: number
  number_card: string
  token: string
  phone: string
}


interface SberBankAmountRes {

  token: string
  login: string
  pass: string
  id_card: number
  uid_bank: string
  number_card: string
}

const app = new Hono();


/*
*** Index page
*/
app.get('/', async (c) => {

  Console.log("[+] New connect");

  return c.text('Please indicate the correct parameters');

});


/*
*** Microservice only SBERBANK (RUB) 
*/
app.post('/micro/payments/sberbank_rub', async (c) => {

  const req: SberBank_RUB = await c.req.json();

  if (req.token) {

    const token: boolean = await Token.verify(req.token, SecretKey.secret_key_micro);

    console.log(`Token ${token}`)

    if (token) {

      console.log("start micro")

      let sber = new SberBank(req.login, req.password, req.trx, req.amount, req.timeout, req.session_uid);

      await sber.payment();

      return c.json({ status: 200 });

    }

    return c.json({ status: 500, message: "token in incorrect" });
  }

  return c.json({ status: 400, message: "token not found" });

});


/*
*** Microservice withdraw only SBERBANK (RUB) 
*/
app.post('/micro/withdraw/sberbank_rub', async (c) => {

  const req: SberBankWithdrawRequest = await c.req.json();

  const token: boolean = await Token.verify(req.token, SecretKey.secret_key_micro);

  if (req.token) {

    if (token) {

      const cber = new SberBankWithdraw(req.login, req.pass, req.id, req.amount, req.number_card, req.phone);

      cber.withdraw();

      return c.json({ status: 200, message: "request accepted" });

    }

    return c.json({ status: 500, message: "token in incorrect" });

  }

  return c.json({ status: 400, message: "token not found" });
});


/*
*** Microservice get amount only SBERBANK (RUB) 
*/
app.post('/micro/amount/sberbank_rub', async (c) => {

  const req: SberBankAmountRes = await c.req.json();

  const token: boolean = await Token.verify(req.token, SecretKey.secret_key_micro);

  if (req.token) {

    if (token) {

      const cber = new SberBankAmount(req.login, req.pass, req.id_card, req.uid_bank, req.number_card);

      cber.amount();

      return c.json({ status: 200, message: "request accepted" });

    }

    return c.json({ status: 500, message: "token in incorrect" });

  }

  return c.json({ status: 400, message: "token not found" });

});


/*
*** Microservice get last transactions only SBERBANK (RUB) 
*/
app.post('/micro/payments/sberbank_rub_trx', async (c) => {

  const req: SberBank_RUB_TRX = await c.req.json();

  if (req.token) {

    const token: boolean = await Token.verify(req.token, SecretKey.secret_key_micro);

    console.log(`Token ${token}`)

    if (token) {

      console.log("start micro trx");

      const sberbank_trx = new SberBankTRX(req.login, req.password, req.session_uid);

      sberbank_trx.payment()

      return c.json({ status: 200 });

    }

    return c.json({ status: 500, message: "token in incorrect" });
  }

  return c.json({ status: 400, message: "token not found" });

});


/*
*** Daemon for test and collection of information meny banks
*/
app.get('/daemon', (c) => {

  /*
  *** only test 
  */
  return c.json({ page: 'daemon' });
});


const port = 3006;

Console.log(`Server is running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });