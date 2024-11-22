
import type { AutoDetectTypes } from '@serialport/bindings-cpp';
import {SerialPort} from 'serialport'


interface Options {
    path: string
    baudRate: number
}

export class ConnectorSIM800C {

    private options: Options;
    private port: SerialPort<AutoDetectTypes> | undefined;


    constructor(path: string, baudRate: number) {

        this.options = {
            'path': path,
            'baudRate': baudRate
        }
    }

    /*
    *** Open port SIM800C
    */
    public async open(): Promise<void | Error> {
        return new Promise<void>((resolve, reject) => {
            this.port = new SerialPort(this.options);

            this.port.open( (err: any) => {
                if (err) {
                    return new Error(err.message);
                }

                console.log("[+] ConnectorSIM800C port is opened");

            });

            this.port.on('open', () => resolve());
            this.port.on('error', (err: Error) => reject(err));
        })
    }

    /*
    *** Send command to SIM800C
    */
    public async sendCommand(command:string, terminator:string = '\r', timeout:number = 30000): Promise<string | void> {
        return new Promise<void | string>((resolve, reject ) => {

            let response: string[] = [];
            let commandTimeout: ReturnType<typeof setTimeout>;

            let listener = (s: string) => {

                response.push(s.toString());

                const lines: string[] = response.join('').split('\r\n').filter(Boolean);
                const lastLine: string = (lines[lines.length - 1] || '').trim();

                if (lastLine === 'ERROR') {
                    clearTimeout(commandTimeout);
                    this.port?.removeListener('data', listener);
                    console.log(lastLine);
                    reject(new Error('Command error'));
                    return;
                }

                if (lastLine === 'OK') {
                    clearTimeout(commandTimeout);
                    this.port?.removeListener('data', listener);
                    resolve(response.join(''))
                }

            }

            this.port?.write(`${command}${terminator}`);
            this.port?.on('data', listener);

            commandTimeout = setTimeout(() => {
                this.port?.removeListener('data', listener);
                reject(new Error(`Command timeout: ${command}`));
            }, timeout);

        });
    }

    /*
    *** Close port SIM800C
    */
    public async close(): Promise<void | Error> {
        return new Promise<Error | void>((resolve, reject) => {
            this.port?.close((err: Error | null) => err ? reject(new Error(err.message)) : resolve());
        });
    }

}
