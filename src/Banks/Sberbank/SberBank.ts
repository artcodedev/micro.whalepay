
import { Console } from '../../Utils/Console';
import { firefox, type Browser, type Locator, type Page } from '@playwright/test'
// import * as fs from 'fs';
import { parse } from 'node-html-parser';
import { Token } from '../../Utils/Token';
import { SecretKey } from '../../Secure/SeckretKey';
import { Fetch } from '../../Utils/Fetch';

/*
*** use proxy
*/

interface Data {
    uohId: string | null
    amount: number | null
}

interface ResponseService {
    status: boolean | null
    answer?: string
    // data?: Data
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
    password: string
    ip: string
    port: string
}

interface Response {
    status: number
    answer: string
    error: Error
    session_uid: string
    token: string
}

enum Error {
    PROXY = "PROXY",
    LOGIN = "LOGIN",
    NETWORK = "NETWORK",
    NOTFOUNDELEM = "NOTFOUNDELEM",
    PARSE = "PARSE",
    TIMEEND = "EXITED",
    SESSIONERROR = "SESSIONERROR",
    OTHER = "OTHER",
    REQVER = "REQVER",
    NONE = "NONE"
}


export class SberBank {

    private login: string;
    private pass: string
    private amount: number;
    private timeEnd: number;
    // private proxy: Proxy;
    private url: string;
    private uohId: string | null = null;
    private browser: Browser | undefined;
    private session_uid: string;

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
    private Error_REQVER: number = 0;

    /*
    *** Constructor
    */
    constructor(login: string, pass: string, uohId: string, amount: number, timeEnd: number, session_uid: string) {

        console.log("constructor start")
        this.login = login;
        this.pass = pass;
        this.amount = amount;
        this.timeEnd = timeEnd;
        // this.proxy = proxy;
        // this.uohId = ;
        this.session_uid = session_uid;
        this.url = 'https://online.sberbank.ru/CSAFront/index.do';
    }

    /*
    *** Response answer when programm is done
    */
    private async response(answer: string | null, error: Error | null) {

        const token: string = await Token.sign({ session_uid: this.session_uid }, SecretKey.secret_key_micro, 60000);

        const data: Response = {
            status: error ? 500 : 200,
            answer: answer ? answer : Error.REQVER,
            error: error ? error : Error.NONE,
            session_uid: this.session_uid,
            token: token,
        }

        console.log(data)

        const fetch = await Fetch.request("http://localhost:5000/api/payment/responsemicroservice", data);

        console.log(fetch);

        // process.exit(1);
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
    *** Get date now (moskow)
    */
    private async dateNow(): Promise<number> {
        return Date.parse(new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
    }

    /*
    *** Parse HTML
    */
    private async parseHTML(html: string): Promise<parseHTMLResponse> {

        try {

            const num: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

            let amount: string = '', uohId: string = '';

            const root = parse(html);

            const operations_wrapper: any | undefined | null = root.getElementById("operations-wrapper");

            if (operations_wrapper) {

                const sections: any | null = operations_wrapper?.getElementsByTagName("section");

                if (sections?.length) {

                    const li: any[] = sections[0].getElementsByTagName("li");

                    if (li.length) {
                        const price: any[] = li[0].getElementsByTagName('p');

                        if (price.length) {

                            const am: string = price[1].innerText;

                            for (let i of am) {
                                if (num.includes(i)) amount += i;
                            }
                        }
                    }

                    const li_uid = sections[li.length > 1 ? 0 : 1].getElementsByTagName("li");

                    if (li_uid.length) {

                        const a: any[] = li_uid[li.length > 1 ? 1 : 0].getElementsByTagName("a");

                        if (a.length) {
                            const uid: string | null = a[0].getAttribute('href').split('=')[1];

                            if (uid) {
                                uohId = uid;
                            }
                        }
                    }

                    if (amount.length && uohId.length) {

                        return { status: true, data: { amount: amount, uohId: uohId } }

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

                await this.close();

                return { status: false, type: Error.NOTFOUNDELEM };
            }

            login[0].fill(this.login)

            Console.log('[+] Search input[type="password"]')
            const password: Locator[] = await page.locator('input[type="password"]').all();

            if (!password.length) {
                await this.close();
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
                await this.close();
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(3000);

            const url: string = await page.url();

            /*
            *** if url will not change because show capcha or incorrect password | login
            */

            if (url == this.url) {

                Console.log('[+] Search input[name="captchaCode"]')
                const catcha: Locator[] = await page.locator('input[name="captchaCode"]').all();

                if (catcha.length) {
                    /*
                    *** change proxy
                    */
                    await this.close();
                    Console.log('[+] Need change proxy (show capcha)')
                    return { status: false, type: Error.PROXY };
                }

                Console.log('[+] Search "Неверный логин или пароль"')
                const sub_unde: Locator[] = await page.getByText('Неверный логин или пароль').all();
                if (sub_unde.length) {
                    /*
                    *** fatal error
                    */
                    await this.close();
                    Console.log('[+] Fatal error (login incorect)')
                    return { status: false, type: Error.LOGIN };
                }

            }

            Console.log('[+] Search "Пропустить"')
            const skip: Locator[] = await page.getByText('Пропустить').all();

            if (skip.length) await skip[0].click();
            else {
                await this.close();
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(5000);

            const history: Locator[] = await page.getByText('История').all();

            if (history.length) await history[0].click();
            else {
                await this.close();
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(5000);

            while (await this.dateNow() < this.timeEnd) {

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

                    if (parseHTML.data) {
                        let amount: number = Number(parseHTML.data?.amount);
                        let uohId: string = parseHTML.data?.uohId;


                        console.log(amount)
                        console.log(uohId)

                        if (this.uohId == null) { }

                        if (typeof this.uohId === 'string' && this.uohId != null) {

                            if (Number(amount) == Number(this.amount) && uohId === this.uohId) {
                                await this.close()
                                return { status: true, answer: "SUCCESS" }
                            }

                            if (Number(amount) != Number(this.amount) && uohId === this.uohId) {
                                await this.close()
                                return { status: true, answer: "REQVER" }
                            }
                            
                        }


                        // if (Number(amount) == Number(this.amount) && uohId === this.uohId) {
                        //     await this.close()
                        //     return { status: true, answer: "SUCCESS" }
                        // }
                        // if (Number(amount) != Number(this.amount) && uohId === this.uohId) {
                        //     await this.close()
                        //     return { status: true, answer: "REQVER" }
                        // }

                    }

                }

                if (status == false) {
                    Console.error(`[+] Status parseHTML: ${status}`)
                    await this.close();
                    return { status: false, type: Error.PARSE }
                }

                Console.warning(`[+] Status parseHTML: ${status}`)
            }

            await this.close();

            return { status: false, type: await this.dateNow() > this.timeEnd ? Error.TIMEEND : Error.OTHER }

        }
        catch (e) {

            await this.close()

        }

        return { status: false, type: Error.OTHER }

    }

    /*
    *** Start app and check errors
    */
    public async payment(): Promise<void> {

        /*
        здесь конечная точка 
        отправляем запрос на сервер в зависимости о ответа ОШИБКА или НЕТ а так же изменение ПРОКСИ 
        */

        console.log("payment pay")

        while (await this.dateNow() < this.timeEnd) {

            const start: ResponseService = await this.start();

            if (start.status) {

                if (start.answer) {

                    await this.response(start.answer, null)

                    return
                }

            }

            if (start.status == false) {
                /* 
                Обработка ошибки
                */
                Console.error("[+] Status false")

                switch (start.type) {

                    case Error.OTHER:
                        Console.error('[+] Error.OTHER')

                        if (this.Error_OTHER > 3) {
                            await this.response("REQVER", Error.OTHER)
                        }
                        this.Error_OTHER++;
                        break

                    case Error.LOGIN:
                        Console.error('[+] Error.LOGIN')

                        if (this.Error_LOGIN > 3) {
                            await this.response(null, Error.LOGIN);
                        }
                        this.Error_LOGIN++;
                        break

                    case Error.NETWORK:
                        Console.error('[+] Error.NETWORK')
                        if (this.Error_NETWORK > 3) {
                            await this.response(null, Error.NETWORK);
                        }
                        this.Error_NETWORK++;
                        break

                    case Error.NOTFOUNDELEM:
                        Console.error('[+] Error.NOTFOUNDELEM')
                        if (this.Error_NOTFOUNDELEM > 3) {
                            await this.response(null, Error.NOTFOUNDELEM);
                        }
                        this.Error_NOTFOUNDELEM++;
                        break

                    case Error.PARSE:
                        Console.error('[+] Error.PARSE')
                        if (this.Error_PARSE > 3) {
                            await this.response(null, Error.PARSE);
                        }
                        this.Error_PARSE++;
                        break

                    case Error.PROXY:
                        Console.error('[+] Error.PROXY')
                        //some do
                        break

                    case Error.TIMEEND:
                        Console.error('[+] Error.TIMEEND')
                        await this.response(Error.TIMEEND, Error.TIMEEND);
                        return

                    case Error.SESSIONERROR:
                        Console.error('[+] Error.SESSIONERROR')
                        if (this.Error_SESSIONERROR > 3) {
                            await this.response(null, Error.SESSIONERROR);
                        }
                        this.Error_SESSIONERROR++;
                        break

                }
            }
        }

        await this.close();

        await this.response(Error.TIMEEND, Error.TIMEEND);

        Console.error('[+] EXITED [+]');

    }

}
