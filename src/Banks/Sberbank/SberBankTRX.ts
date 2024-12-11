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
}

interface ResponseService {
    status: boolean | null
    data?: Data
    type?: Error
}

interface parseHTMLResponseData {
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
    error: Error | null
    trx: string
    session_uid: string
    token: string
}

enum Error {
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

export class SberBankTRX {

    private login: string;
    private pass: string
    private url: string;
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
    private Error_TIMEEND: number = 0;
    private Error_SESSIONERROR: number = 0;

    /*
    *** Constructor
    */
    constructor(login: string, pass: string, session_uid: string) {
        this.login = login;
        this.pass = pass;
        this.session_uid = session_uid;
        this.url = 'https://online.sberbank.ru/CSAFront/index.do';
    }

    /*
    *** Response answer when programm is done
    */
    private async response(trx: string | null, error: Error | null) {

        const token: string = await Token.sign({ session_uid: this.session_uid }, SecretKey.secret_key_micro, 60000);

        const data: Response = {
            status: error ? 500 : 200,
            error: error ? error : Error.NONE,
            trx: trx ? trx : '',
            session_uid: this.session_uid,
            token: token
        }

        console.log("REAPONSE")
        console.log(data)

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

            const root = parse(html);

            const operations_wrapper = root.getElementById("operations-wrapper");

            const sections = operations_wrapper?.getElementsByTagName("section");

            if (sections?.length) {

                const li = sections[0].getElementsByTagName("li");

                const a = li[0].getElementsByTagName("a");

                return {status: true, data: {uohId: a[0].attrs.href.split('=')[1]} }
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

            await this.delay(10000);

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

                let uohId: string | undefined = parseHTML.data?.uohId;

                if (uohId != undefined) {

                    await this.close()

                    return { status: true, data: { uohId: uohId } }

                }
            }

            if (status == false) {
                Console.error(`[+] Status parseHTML: ${status}`)
                await this.browser.close()
                return { status: false, type: Error.PARSE }
            }

            Console.warning(`[+] Status parseHTML: ${status}`)

            await this.browser.close()

            return { status: false, type: Error.OTHER }

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

        while (true) {

            const start: ResponseService = await this.start();

            if (start.status) {

                const uohId: string | null | undefined = start.data?.uohId;

                if (uohId) {
                    await this.response(uohId, uohId === '' ? Error.REQVER : null)
                }

                return
            }

            if (start.status == false) {
                /* 
                *** Check errors
                */
                Console.error("[+] Status false")

                switch (start.type) {

                    case Error.OTHER:
                        Console.error('[+] Error.OTHER')

                        if (this.Error_OTHER > 2) {
                            await this.response(null, Error.OTHER)
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
                        if (this.Error_NETWORK > 2) {
                            await this.response(null, Error.NETWORK);
                        }
                        this.Error_NETWORK++;
                        break

                    case Error.NOTFOUNDELEM:
                        Console.error('[+] Error.NOTFOUNDELEM')
                        if (this.Error_NOTFOUNDELEM > 2) {
                            await this.response(null, Error.NOTFOUNDELEM);
                        }
                        this.Error_NOTFOUNDELEM++;
                        break

                    case Error.PARSE:
                        Console.error('[+] Error.PARSE')
                        if (this.Error_PARSE > 2) {
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
                        if (this.Error_TIMEEND > 2) {
                            await this.response(null, Error.TIMEEND);
                        }
                        this.Error_TIMEEND++;
                        break

                    case Error.SESSIONERROR:
                        Console.error('[+] Error.SESSIONERROR')
                        if (this.Error_SESSIONERROR > 2) {
                            await this.response(null, Error.SESSIONERROR);
                        }
                        this.Error_SESSIONERROR++;
                        break

                }
            }
        }

    }
}