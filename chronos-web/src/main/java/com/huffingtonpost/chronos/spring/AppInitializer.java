package com.huffingtonpost.chronos.spring;

import com.huffingtonpost.chronos.servlet.TestConfig;
import org.springframework.web.WebApplicationInitializer;
import org.springframework.web.context.ContextLoaderListener;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.DispatcherServlet;

import javax.servlet.ServletContext;
import javax.servlet.ServletRegistration;

public class AppInitializer implements WebApplicationInitializer {

  @Override
  public void onStartup(ServletContext container) {
    AnnotationConfigWebApplicationContext rootContext =
      new AnnotationConfigWebApplicationContext();
    rootContext.register(TestConfig.class);
    rootContext.registerShutdownHook();
    container.addListener(new ContextLoaderListener(rootContext));

    ServletRegistration.Dynamic dispatcher =
      container.addServlet("chronos-dispatcher", new DispatcherServlet(rootContext));
    dispatcher.setLoadOnStartup(1);
    dispatcher.addMapping("/swagger-ui.html");
    dispatcher.addMapping("/*");
  }
}
