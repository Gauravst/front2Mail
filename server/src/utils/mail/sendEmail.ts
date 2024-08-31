import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

interface EmailData {
  email: string;
  template: string;
  otp: string;
  subject: string;
}

export const sendEmail = async (
  data: EmailData
): Promise<nodemailer.SentMessageInfo | Error> => {
  const { email, template, otp, subject } = data;

  if (!email || !template || !otp || !subject) {
    throw new Error('Missing required fields');
  }

  try {
    const file = `src/utils/mail/mailTemplate/${template}.hbs`;
    const source = await readFileAsync(file, 'utf8');
    const templateFile = handlebars.compile(source);

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const html = templateFile({ otp });
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    return error as Error;
  }
};
