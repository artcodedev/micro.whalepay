
import { AnswersError } from "../Models/Answers/AnswersErrorModels";

export class Answers {

    public static wrong(msg: string): AnswersError {
        return {status: 505, message: msg}
    }

    public static errorDB(msg: string): AnswersError {
        return {status: 402, message: msg}
    }

    public static notFound(msg: string): AnswersError  {
        return {status: 400, message: msg}
    }

    public static serverError(msg: string): AnswersError  {
        return {status: 500, message: msg}
    }

}