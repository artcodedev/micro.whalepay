
import { Console } from '../../Utils/Console';
import { firefox, type Browser, type Locator, type Page} from '@playwright/test'
// import * as fs from 'fs';
import { parse } from 'node-html-parser';

/*
*** use proxy
*/

interface Data {
    uohId: string | null
    amount: string | null
}

interface ResponseService {
    status: boolean | null
    data?: Data
    type?: Error
}

interface parseHTMLResponseData {
    amount: string
    uohId: string
}

interface parseHTMLResponse {
    status: boolean | null
    data?: parseHTMLResponseData | null
}

interface Proxy {
    login: string
    pass: string
    ip: string
    port: string
}

enum Error {
    PROXY,
    LOGIN,
    NETWORK,
    NOTFOUNDELEM,
    PARSE,
    TIMEEND,
    SESSIONERROR,
    OTHER,
    REQVER
}

export class SberBank {

    private login: string;
    private pass: string
    private amount: string;
    private timeEnd: number;
    private proxy: Proxy;
    private url: string;
    private uohId: string;
    private browser: Browser | undefined;

    constructor(login: string, pass: string, uohId: string, amount: string, timeEnd: number, proxy: Proxy) {
        this.login = login;
        this.pass = pass;
        this.amount = amount;
        this.timeEnd = timeEnd;
        this.proxy = proxy;
        this.uohId = uohId;
        this.url = 'https://online.sberbank.ru/CSAFront/index.do';
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
    *** Parse HTML
    */
    private async parseHTML(html: string): Promise<parseHTMLResponse> {

        try {

            const num: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

            let amount: string = '', uohId: string = '';

            const root = parse(html);

            const main = root.getElementsByTagName('main');

            const section = main[0]?.childNodes[3]?.childNodes[1]?.childNodes[0]?.childNodes[1]?.childNodes[1]?.childNodes[0]?.childNodes[0];

            if (section != undefined) {

                const a = section?.childNodes[1]?.childNodes[0]?.childNodes[0];

                if (a != undefined) {
                    const price: string = a?.childNodes[1]?.childNodes[0]?.childNodes[1]?.innerText;
                    const uohIdp: string = a?.childNodes[0]?.parentNode?.attrs?.href?.split('=')[1];

                    if (price != undefined && uohIdp != undefined) {

                        for (let i of price) {
                            if (num.includes(i)) amount += i;
                        }

                        if (this.amount === amount && this.uohId !== uohId) {
                            return { status: true, data: { amount: amount, uohId: uohIdp } }
                        }

                    }

                }
            }

            return { status: null }
        }
        catch (e) {
            return { status: false }
        }

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
                    Console.log('[+] Need change proxy (show capcha)')
                    return { status: false, type: Error.PROXY };
                }

                Console.log('[+] Search "Неверный логин или пароль"')
                const sub_unde: Locator[] = await page.getByText('Неверный логин или пароль').all();
                if (sub_unde.length) {
                    /*
                    *** fatal error
                    */
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

            await this.delay(5000);

            const history: Locator[] = await page.getByText('История').all();

            if (history.length) await history[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(5000);

            while (Date.now() < this.timeEnd) {

                await page.reload();
                await this.delay(5000)

                const sessionError: Locator[] = await page.getByText('Сеанс работы завершён').all();

                if (sessionError.length) {
                    await this.close();
                    return { status: false, type: Error.SESSIONERROR }
                }

                const html: string = await page.content();
                Console.warning("[+] Update content");

                let parseHTML: parseHTMLResponse = await this.parseHTML(html);

                const status: boolean | null = parseHTML.status;

                if (status) {

                    Console.ok(`[+] Status parseHTML: ${status}`)

                    console.log(status)

                    let amount: string | undefined = parseHTML.data?.amount;
                    let uohId: string | undefined = parseHTML.data?.uohId;

                    if (amount != undefined && uohId != undefined) {

                        await this.close()

                        return { status: true, data: { uohId: uohId, amount: amount } }

                    }
                }

                if (status == false) {
                    Console.error(`[+] Status parseHTML: ${status}`)
                    await this.browser.close()
                    return { status: false, type: Error.PARSE }
                }

                Console.warning(`[+] Status parseHTML: ${status}`)
            }

            await this.browser.close()
            return { status: false, type: Date.now() > this.timeEnd ? Error.TIMEEND : Error.OTHER }

        }
        catch (e) {

            await this.close()

        }

        return { status: false, type: Error.OTHER }

    }

    public async payment(): Promise<void> {

        /*
        здесь конечная точка 
        отправляем запрос на сервер в зависимости о ответа ОШИБКА или НЕТ а так же изменение ПРОКСИ 
        */

        while (Date.now() < this.timeEnd) {

            const start: ResponseService = await this.start();

            if (start.status) {
                Console.ok(start.data)
                
                return
            }

            if (start.status == false) {
                /* 
                Обработка ошибки
                */
               Console.error("[+] Status false")

                switch (start.type) {

                    case Error.OTHER:
                        Console.error('[+] Error.OTHER')
                        /* 
                        *** some do
                        *** if (error > a) { fetch } 
                        */
                        break

                    case Error.LOGIN:
                        Console.error('[+] Error.LOGIN')
                        //some do
                        break

                    case Error.NETWORK:
                        Console.error('[+] Error.NETWORK')
                        //some do
                        break

                    case Error.NOTFOUNDELEM:
                        Console.error('[+] Error.NOTFOUNDELEM')
                        //some do
                        break

                    case Error.PARSE:
                        Console.error('[+] Error.PARSE')
                        //some do
                        break

                    case Error.PROXY:
                        Console.error('[+] Error.PROXY')
                        //some do
                        break

                    case Error.TIMEEND:
                        Console.error('[+] Error.TIMEEND')
                        //some do
                        break

                    case Error.SESSIONERROR:
                        Console.error('[+] Error.SESSIONERROR')
                        //some do
                        break
                    case Error.REQVER:
                        Console.error('[+] Error.REQVER')
                        //some do
                        break
                }
            }
        }

        await this.close()

        Console.error('[+] EXITED [+]');

    }
}



/*

ERRORS 

-- PROXY (менять прокси пока доступно время )
-- LOGIN (три попытки входа)
-- NETWORK (менять прокси пока доступно время )
-- NOTFOUNDELEM (если не нашел элемент 5 раз тогда ошибка)
-- PARSE (три попытки входа)

*/


