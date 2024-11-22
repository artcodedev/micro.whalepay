


// import { ConnectorSIM800C } from "./ConnectorSIM800C";
import { ConnectorSIM800C } from './ConnectorSIM800C.js';
import punycode from 'punycode';

interface Message {
    id: string
    phone: string
    date: string
    message: string
}

interface NewMessages {
    type: string;
    phone: any;
    date: any;
    message: string;
}


export class Sim800c {

    private connectorSIM800C: ConnectorSIM800C;

    constructor(path: string, port: number) {
        this.connectorSIM800C = new ConnectorSIM800C(path, port);
    }

    /*
    *** Open port SIM800c
    */
    public async openPortSim800c(): Promise<void> {
        await this.connectorSIM800C.open();
    }

    /*
    *** Close port SIM800c
    */
    public async closePortSim800c(): Promise<void> {
        await this.connectorSIM800C.close();
    }

    public async test(command: string): Promise<string> {

        let com: string | void = await this.connectorSIM800C.sendCommand(command);
        return com ? com : '';
    }

    /*
    *** privare method
    *** decode UCS2 to UTF
    */
    private async decodeUCS2(message: string = ''): Promise<string> {

        try {
            const txt_codes: RegExpMatchArray | null = message.match(/.{1,4}/g);
            let codes: number[] = [];
            if (txt_codes != null) {
                txt_codes.forEach((i) => codes.push(parseInt(i, 16)));
            }
            return punycode.ucs2.encode(codes);
        }
        catch {
            return message
        }

    }

    /*
    *** privare method
    */
    private async getAllMessagesM(number: string): Promise<Message[]> {

        await this.connectorSIM800C.sendCommand("AT+CMGF=1");

        const response: Message[] = [];

        const allMessage: string | void = await this.connectorSIM800C.sendCommand("AT+CMGL=\"ALL\"");

        const massMessage: string[] | undefined = allMessage?.split("\r\n\r\n");

        if (massMessage != undefined) {
            for (let i = 0; i < massMessage.length; i++) {

                const spliMassMessage: string[] = massMessage[i].split(",");

                if (spliMassMessage.length >= 5) {
                    const phone: string = spliMassMessage[2].replaceAll('"', '')

                    const message: Message = {
                        id: (i++).toString(),
                        phone: phone,
                        date: spliMassMessage[4],
                        message: await this.decodeUCS2(spliMassMessage[5].split('\r\n')[1])
                    }

                    if (number) {
                        if (number === phone) {
                            response.push(message);
                        }

                    } else {
                        response.push(message);
                    }
                }

            }
        }



        return response;
    }

    /*
    *** privare method
    */
    private async getNewMessage(number: string): Promise<NewMessages[]> {
        await this.connectorSIM800C.sendCommand("AT+CMGF=1");

        const unread: string = "REC UNREAD";
        const response: NewMessages[] = [];

        const allMessage: string | void = await this.connectorSIM800C.sendCommand("AT+CMGL=\"ALL\"");

        if (allMessage) {
            if (allMessage.includes(unread)) {

                const massMessage: string[] = allMessage.split("\r\n\r\n");

                for (let i = 0; i < massMessage.length; i++) {

                    const spliMassMessage: string[] = massMessage[i].split(",");

                    if (spliMassMessage.length >= 5) {
                        const phone: string = spliMassMessage[2].replaceAll('"', '')

                        const message: NewMessages = {
                            type: unread,
                            phone: phone,
                            date: spliMassMessage[4],
                            message: await this.decodeUCS2(spliMassMessage[5].split('\r\n')[1])
                        }

                        if (spliMassMessage[1] === unread) {
                            if (number) {
                                if (number === phone) {
                                    response.push(message);
                                }

                            } else {
                                response.push(message);
                            }
                        }
                    }

                }

            }
        }

        return response;
    }

    /*
    *** Get all messages if {number == null} or get all messages use {number} 
    */
    public async getAllMessages(number: string): Promise<Message[]> {

        return await this.getAllMessagesM(number);

    }

    /*
    *** Sort the entire message using the sort number
    */
    public async getLastMessage(number: string): Promise<Message | []> {

        if (!number) return []

        const message = await this.getAllMessages(number);

        return message[message.length - 1];
    }

    /*
    *** Get last new message use number or not
    */
    public async getNewLastMessage(number: string): Promise<NewMessages | []> {

        const getNewMessage = await this.getNewMessage(number);

        return getNewMessage.length ? getNewMessage.reverse()[getNewMessage.length - 1] : [];

    }

    /*
    *** Get all new message use number or not
    */
    public async getNewAllMessage(number: string): Promise<NewMessages[]> {
        return await this.getNewMessage(number);
    }

    /*
    *** Delete all message
    */
    public async deleteAllMessage(): Promise<void> {

        await this.connectorSIM800C.sendCommand("AT+CMGF=1");

        await this.connectorSIM800C.sendCommand("AT+CMGDA=\"DEL ALL\"");

    }

}
