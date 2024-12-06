

import fs from 'fs-extra'

export class Logger {

    public static async write(file: string | undefined, message: any) {

        if (file && message) {

            const mess: string = `[+] ${new Date()} ${message}\n`;
            fs.outputFileSync(file, mess, { flag: 'a+' })
            
        }
    }

}

