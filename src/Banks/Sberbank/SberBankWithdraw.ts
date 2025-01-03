
import { SecretKey } from "../../Secure/SeckretKey";
import { Console } from "../../Utils/Console";
import { Fetch } from "../../Utils/Fetch";
import { Token } from "../../Utils/Token";
import { firefox, type Browser, type Locator, type Page } from '@playwright/test'
import { SMSCode } from "../../Utils/SMSCode";




interface ResponseService {
    status: boolean | null
    type?: Error
}


enum Error {
    CODESMS = "CODESMS",
    DELETESMS = "DELETESMS",
    PROXY = "PROXY",
    LOGIN = "LOGIN",
    NETWORK = "NETWORK",
    NOTFOUNDELEM = "NOTFOUNDELEM",
    PARSE = "PARSE",
    TIMEEND = "TIMEEND",
    SESSIONERROR = "SESSIONERROR",
    OTHER = "OTHER",
    REQVER = "REQVER",
    NONE = "NONE"
}

export class SberBankWithdraw {

    private browser: Browser | undefined;
    private url: string;
    private login: string;
    private pass: string;
    private id: number;
    private amount: number;
    private number_card: string
    private phone: string
    private DOME_OPERATION: boolean = false;

    /*
    *** Count errors
    */
    private Error_OTHER: number = 0;
    private Error_LOGIN: number = 0;
    private Error_PROXY: number = 0;
    private Error_NETWORK: number = 0;
    private Error_NOTFOUNDELEM: number = 0;
    private Error_PARSE: number = 0;
    private Error_SESSIONERROR: number = 0;
    private Error_CODESMS: number = 0
    private Error_DELETESMS: number = 0

    constructor(login: string, pass: string, id: number, amount: number, number_card: string, phone: string) {
        this.login = login;
        this.pass = pass;
        this.id = id
        this.amount = amount
        this.number_card = number_card
        this.phone = phone
        this.url = 'https://online.sberbank.ru/CSAFront/index.do';
    }

    /*
    *** Response answer when programm is done
    */
    private async response(error: Error | null) {

        const token: string = await Token.sign({ session_uid: '' }, SecretKey.secret_key_micro, 60000);

        const data = {
            status: error ? 500 : 200,
            error: error ? error : Error.NONE,
            id: this.id,
            token: token
        }

        console.log(data)

        this.DOME_OPERATION = true

        await Fetch.request("http://localhost:5000/api/micro/withdraw", data);

    }

    /*
    *** Time sleep (delay)(miliseconds)
    */
    private async delay(time: number): Promise<void> {
        return new Promise(function (resolve) {
            setTimeout(resolve, time)
        });
    }

    /*
    *** Close browser
    */
    private async close(): Promise<void> {
        try {

            Console.log('[+] Close browser');
            if (this.browser != undefined) await this.browser.close();
        }
        catch (e) {
            Console.warning('[+] browser is closed')
        }
    }

    /*
    *** All megic here :)
    */
    private async start(): Promise<ResponseService> {

        try {

            this.browser = await firefox.launch({ headless: false, executablePath: '' });
            const page: Page = await this.browser.newPage();

            // defore delete
            try {
                await page.goto(this.url, { timeout: 10000, waitUntil: "domcontentloaded" });
            } catch (e) {
                /*
                *** slow internat 
                */
            }

            await this.delay(3000);

            Console.log('[+] Search input[autocomplete="login"]')
            const login: Locator[] = await page.locator('input[autocomplete="login"]').all();

            if (!login.length) {

                await this.browser.close()

                return { status: false, type: Error.NOTFOUNDELEM };
            }

            login[0].fill(this.login)

            Console.log('[+] Search input[type="password"]')
            const password: Locator[] = await page.locator('input[type="password"]').all();

            if (!password.length) {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            password[0].fill(this.pass)

            Console.log('[+] Search "Войти"')
            const submit: Locator[] = await page.getByText('Войти').all();

            if (submit.length) await submit[0].click();
            else {
                /*
                *** Not found something elems
                */
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(3000);

            const url: string = await page.url();

            /*
            *** if url will not change because show capcha or incorrect password|login
            */

            if (url == this.url) {

                Console.log('[+] Search input[name="captchaCode"]')
                const catcha: Locator[] = await page.locator('input[name="captchaCode"]').all();

                if (catcha.length) {
                    /*
                    *** change proxy
                    */
                    await this.delay(3000);
                    await this.browser.close()
                    Console.log('[+] Need change proxy (show capcha)')
                    return { status: false, type: Error.PROXY };
                }

                Console.log('[+] Search "Неверный логин или пароль"')
                const sub_unde: Locator[] = await page.getByText('Неверный логин или пароль').all();
                if (sub_unde.length) {
                    /*
                    *** fatal error
                    */

                    await this.delay(3000);
                    await this.browser.close()
                    Console.log('[+] Fatal error (login incorect)')
                    return { status: false, type: Error.LOGIN };
                }

            }

            Console.log('[+] Search "Пропустить"')
            const skip: Locator[] = await page.getByText('Пропустить').all();

            if (skip.length) await skip[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(10000);

            Console.log('[+] Search "Новый перевод"')
            const new_translation: Locator[] = await page.getByText('Новый перевод').all();

            if (new_translation.length) await new_translation[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(5000);

            Console.log('[+] Search input[type="tel"]')
            const number_card: Locator[] = await page.locator('input[type="tel"]').all();

            if (!number_card.length) {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            number_card[0].fill(this.number_card);

            await this.delay(1000);

            Console.log('[+] Search "Продолжить"')
            const next_step: Locator[] = await page.getByText('Продолжить').all();

            if (next_step.length) await next_step[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(5000);

            Console.log('[+] Search "Продолжить v1"')
            const next_step_v1: Locator[] = await page.locator('button[aria-label="Продолжить"]').all();

            if (next_step_v1.length) await next_step_v1[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(5000);

            Console.log('[+] Delete all sms')
            const deleteSMS: { status: boolean } = await SMSCode.deleteSMS(this.phone);

            Console.log(`[+] Delete all sms ${deleteSMS.status}`)
            if (deleteSMS.status == false) {
                await this.browser.close()
                return { status: false, type: Error.DELETESMS };
            }

            Console.log('[+] Search input[label="Сумма"]')
            const amount: Locator[] = await page.locator('input[label="Сумма"]').all();

            if (!amount.length) {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            amount[0].fill(this.amount.toString());

            await this.delay(3000);

            Console.log('[+] Search "Продолжить"')
            const next_step_v2: Locator[] = await page.getByText('Продолжить').all();

            if (next_step_v2.length) await next_step_v2[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(3000);

            let code_sms: string = ''

            let count = 0;

            while (true) {

                await this.delay(5000);

                Console.log('[+] Request get sms')
                const code_sms_res: { status: boolean, data?: string } = await SMSCode.getSMS(this.phone);

                Console.log(`[+] Response sms code ${code_sms_res.status}`)
                if (count == 3) {
                    await this.browser.close()
                    return { status: false, type: Error.CODESMS };
                }

                if (code_sms_res.status && code_sms_res.data?.length) {

                    code_sms = code_sms_res.data
                    break
                }

                count++;
            }

            await this.delay(2000);

            Console.log('[+] Search input[aria-label="Поле ввода кода из смс"]')
            const code: Locator[] = await page.locator('input[aria-label="Поле ввода кода из смс"]').all();

            if (!code.length) {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            if (code_sms.length) {
                code[0].fill(code_sms);
            } else {
                await this.browser.close()
                return { status: false, type: Error.CODESMS };
            }

            await this.delay(1000);

            Console.log('[+] Search "Подтвердить"')
            const done: Locator[] = await page.getByText('Подтвердить').all();

            if (done.length) await done[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(7000);

            const transaction_ok: Locator[] = await page.getByText('Перевод доставлен').all();

            await this.delay(1000);

            await this.browser.close()

            return transaction_ok.length ? { status: true } : { status: false, type: Error.OTHER }

        }
        catch (e) {

            await this.close()

            return { status: false, type: Error.OTHER }
        }

    }

    /*
    *** Start app and check errors
    */
    public async withdraw(): Promise<void> {

        let staper: boolean  = true 

        while (staper) {

            if (this.DOME_OPERATION) {
                staper = false
                return
            }

            const start: ResponseService = await this.start();

            if (start.status) {

                await this.response(null)

                staper = false

                return

            }

            if (start.status == false) {

                /* 
                *** Check errors
                */
                Console.error("[+] Status false")

                switch (start.type) {

                    case Error.CODESMS:
                        Console.error('[+] Error.CODESMS')


                        if (this.Error_CODESMS > 2) {
                            await this.response(Error.CODESMS);
                            staper = false
                        }

                        this.Error_CODESMS++

                        break

                    case Error.DELETESMS:
                        Console.error('[+] Error.DELETESMS');

                        if (this.Error_DELETESMS > 2) {
                            await this.response(Error.DELETESMS);
                            staper = false
                        }

                        this.Error_DELETESMS++

                    case Error.OTHER:
                        Console.error('[+] Error.OTHER')

                        if (this.Error_OTHER > 2) {
                            await this.response(Error.OTHER);
                            staper = false
                        }
                        this.Error_OTHER++;
                        break

                    case Error.LOGIN:
                        Console.error('[+] Error.LOGIN')

                        if (this.Error_LOGIN > 3) {
                            await this.response(Error.LOGIN);
                            staper = false
                        }
                        this.Error_LOGIN++;
                        break

                    case Error.NETWORK:
                        Console.error('[+] Error.NETWORK')
                        if (this.Error_NETWORK > 2) {
                            await this.response(Error.NETWORK);
                            staper = false
                        }
                        this.Error_NETWORK++;
                        break

                    case Error.NOTFOUNDELEM:
                        Console.error('[+] Error.NOTFOUNDELEM')
                        if (this.Error_NOTFOUNDELEM > 2) {
                            await this.response(Error.NOTFOUNDELEM);
                            staper = false
                        }
                        this.Error_NOTFOUNDELEM++;
                        break

                    case Error.PARSE:
                        Console.error('[+] Error.PARSE')
                        if (this.Error_PARSE > 2) {
                            await this.response(Error.PARSE);
                            staper = false
                        }
                        this.Error_PARSE++;
                        break

                    case Error.PROXY:
                        Console.error('[+] Error.PROXY')
                        //some do
                        break

                    case Error.SESSIONERROR:
                        Console.error('[+] Error.SESSIONERROR')
                        if (this.Error_SESSIONERROR > 2) {
                            await this.response(Error.SESSIONERROR);
                            staper = false
                        }
                        this.Error_SESSIONERROR++;
                        break

                }
            }
        }

    }

}