package com.huffingtonpost.chronos.util;

import java.io.UnsupportedEncodingException;
import java.net.InetAddress;

import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

import org.apache.log4j.Logger;

import com.huffingtonpost.chronos.model.MailInfo;

public class SendMail {
  public static Logger LOG = Logger.getLogger(SendMail.class);

  @CoverageIgnore
  public static void doSend(String subject, String messageBody, MailInfo mailInfo, Session session) {
    String hostname = "";
    try {
      hostname = InetAddress.getLocalHost().getHostName();
    } catch (Exception ignore) {}
    
    try {
      Message msg = new MimeMessage(session);
      msg.setFrom(new InternetAddress(mailInfo.from, mailInfo.fromName + " " + hostname));
      for (String currTo : mailInfo.to.split(",")) {
        msg.addRecipient(Message.RecipientType.TO,
                         new InternetAddress(currTo, mailInfo.toName));
      }
      msg.setSubject(subject);
      msg.setContent(messageBody, "text/html");
      Transport.send(msg);
      
    } catch (UnsupportedEncodingException | MessagingException e) {
      LOG.error("SendMail error:", e);
    }
    LOG.info(String.format("Sent email from %s, to %s", mailInfo.from, mailInfo.to));
  }
}
