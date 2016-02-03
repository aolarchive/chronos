package com.huffingtonpost.chronos.servlet;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class OtherController {
  
  @RequestMapping("/ping")
  public @ResponseBody String ping() {
    return "pong";
  }

}
