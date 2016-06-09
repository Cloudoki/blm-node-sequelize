const debug = require('debug')('mailer');
const nodemailer = require('nodemailer');
const path = require('path');
const Promise = require('bluebird');
const juice = require('juice');
const exphbs = require('express-handlebars');
const mandrillTransport = require('nodemailer-mandrill-transport');
const htmlToText = require('nodemailer-html-to-text').htmlToText;
const fs = require('fs');
const css = fs.readFileSync(path.resolve(process.cwd(),
  './node_modules/hyper-ui-donderstarter/dist/css/main.css'), 'utf8');

const handleMailerResponse = (resolve, reject) => (err, res) => {
  if (err) {
    return reject(err);
  }

  if (res.accepted.length) {
    return resolve(res);
  }

  if (res.rejected.length) {
    const error = new Error(res.rejected[0] ?
      res.rejected[0].reject_reason : 'rejected');
    error.code = 'MAIL_REJECTED';
    return reject(error);
  }

  reject(new Error('unexpected mailer response'));
};


module.exports.createMailer = config => {
  const viewsPath = path.resolve(process.cwd(), config.views.path);
  const viewPath = (view, type) => viewsPath + '/' + view + '.' + type +
    config.views.extname;
  const platform = config.platform;
  const hbs = exphbs.create(config.views);
  const render = (template, type, context) =>
    new Promise((resolve, reject) => {
      const opts = context || {};
      if (!opts.data) {
        opts.data = {};
      }

      if (!opts.data.platform) {
        opts.data.platform = platform;
      }

      if (type === 'subject') {
        opts.layout = false;
      }

      hbs.renderView(viewPath(template, type), opts, (err, html) => err ?
        reject(err) :
        resolve((type === 'mail' && css) ? juice.inlineContent(html, css) :
          html)
      );
    });

  const mandrill = nodemailer.createTransport(
    mandrillTransport(config.mandrill)
  );

  mandrill.use('compile', htmlToText(config.htmlToText));

  const mandrillClient = mandrill.transporter.mandrillClient;
  return {
    mandrill,
    mandrillClient,
    sendMail: options => Promise.resolve().then(() => {
      if (!options.from) {
        options.from = config.mailFrom;
      }
      if (options.template && !options.html) {
        debug('building html');
        return render(options.template, 'mail', options.context)
          .then(html => {
            options.html = html;
          });
      }
    }).then(() => {
      if (!options.subject) {
        debug('building subject');
        return render(options.template, 'subject', options.context)
          .then(subject => {
            options.subject = subject;
          });
      }
    }).then(() => new Promise((resolve, reject) =>
      mandrill.sendMail(options, handleMailerResponse(resolve, reject))))
  };
};
