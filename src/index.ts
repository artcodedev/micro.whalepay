
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
import { Token } from './Token';



interface Proxy {
  login: string
  pass: string
  ip: string
  port: string
}

interface SberBank_RUB {
  login: string
  password: string
  amount: string
  proxy: Proxy
  timeout: number
  trx: string
  token: string
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


  if (req.token) {
    const token: boolean = await Token.VarifyToket(req.token);

    if (token) {

      let s = new SberBank(req.login, req.password, req.trx, req.amount, req.timeout, req.proxy);

      s.payment()

      return c.json({status: 200});

    }

    return c.json({status: 505, message: "token in incorrect"});
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

const port = 3005;

Console.log(`Server is running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
