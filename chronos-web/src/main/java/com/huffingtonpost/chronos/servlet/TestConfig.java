package com.huffingtonpost.chronos.servlet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huffingtonpost.chronos.agent.AgentConsumer;
import com.huffingtonpost.chronos.agent.AgentDriver;
import com.huffingtonpost.chronos.agent.NoReporting;
import com.huffingtonpost.chronos.agent.Reporting;
import com.huffingtonpost.chronos.model.JobDao;
import com.huffingtonpost.chronos.model.JobDaoImpl;
import com.huffingtonpost.chronos.model.MailInfo;
import com.huffingtonpost.chronos.model.SupportedDriver;
import com.huffingtonpost.chronos.spring.ChronosMapper;
import com.huffingtonpost.chronos.spring.Utils;
import com.huffingtonpost.chronos.util.H2TestUtil;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.resource.GzipResourceResolver;
import org.springframework.web.servlet.resource.PathResourceResolver;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.sql.DataSource;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

/**
 * Docs here: http://docs.spring.io/spring/docs/current/spring-framework-reference/html/mvc.html#mvc-config-customize
 * And here: http://www.robinhowlett.com/blog/2013/02/13/spring-app-migration-from-xml-to-java-based-config/
 */
@ComponentScan( basePackageClasses = { ChronosController.class, OtherController.class } )
@EnableSwagger2
@Configuration
@EnableWebMvc
public class TestConfig extends WebMvcConfigurerAdapter {

  private static String LOCALHOST = "localhost";

  @Bean(name="reportRootPath")
  public String reportRootPath() {
    return System.getProperty("user.dir") + "/tmp/reports/";
  }

  @Bean(name="drivers")
  public ArrayList<SupportedDriver> drivers() {
    SupportedDriver h2 = new SupportedDriver(H2TestUtil.H2_NAME,
        H2TestUtil.H2_DRIVER, H2TestUtil.H2_QUERY, H2TestUtil.H2_URL);
    ArrayList<SupportedDriver> list = new ArrayList<>();
    list.add(h2);
    return list;
  }

  @Override
  public void configureDefaultServletHandling(DefaultServletHandlerConfigurer configurer) {
    configurer.enable();
  }

  @Override
  public void configurePathMatch(PathMatchConfigurer configurer) {
    super.configurePathMatch(configurer);
    configurer.setUseSuffixPatternMatch(false);
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/*.*", "/ico/**", "/reports/**", "swagger-ui.html", "/webjars/**")
      .addResourceLocations("/site/", "/site/ico/", "file:" + reportRootPath(),
        "classpath:/META-INF/resources/", "classpath:/META-INF/resources/webjars/")
      .resourceChain(true)
      .addResolver(new GzipResourceResolver())
      .addResolver(new PathResourceResolver());
  }

  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    registry.addViewController("/").setViewName("/WEB-INF/site/index.html");
    registry.addViewController("/jobs/**").setViewName("/WEB-INF/site/index.html");
    registry.addViewController("/job/**").setViewName("/WEB-INF/site/index.html");
  }

  @Override
  public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
    converters.add(converter());
  }

  @Bean
  public ObjectMapper jacksonObjectMapper() {
    return new ChronosMapper();
  }

  @Bean
  public Properties authMailProperties() {
    Properties props = new Properties();
    props.put("mail.smtp.auth", "true");
    props.put("mail.smtp.starttls.enable", "true");
    props.put("mail.smtp.host", "smtp.example.com");
    props.put("mail.smtp.localhost", "smtp.example.com");
    props.put("mail.smtp.port", "25");
    return props;
  }

  @Bean
  public Properties relayMailProperties() {
    Properties props = new Properties();
    props.put("mail.smtp.auth", "false");
    props.put("mail.smtp.host", "localhost");
    props.put("mail.smtp.localhost", "localhost");
    props.put("mail.smtp.port", "25");
    return props;
  }

  @Bean
  public Session relaySession() {
    return Session.getDefaultInstance(relayMailProperties());
  }

  @Bean
  public MailInfo mailInfo() {
    return new MailInfo("noreply@example.com", "Example From",
        "help@example.com", "Example To");
  }

  @Bean
  public Session authSession() {
    final String username = "spluh";
    final String password = "abracaduh";
    Session session = Session.getInstance(authMailProperties(), new javax.mail.Authenticator() {
      protected PasswordAuthentication getPasswordAuthentication() {
      return new PasswordAuthentication(username, password);
      }
    });
    return session;
  }

  @Bean
  public MappingJackson2HttpMessageConverter converter() {
    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(jacksonObjectMapper());
    return converter;
  }

  @Bean(name="dataSource")
  public DataSource ds() {
    DataSource ds = Utils.getPooledDataSource(H2TestUtil.H2_URL,
      10, 30 * 1000);
    return ds;
  }

  @DependsOn(value="dataSource")
  @Bean(initMethod="init", destroyMethod="close", name="jobDao")
  public JobDao jobDao() {
    JobDao dao = new JobDaoImpl();
    dao.setDrivers(drivers());
    dao.setDataSource(ds());
    return dao;
  }

  @Bean(name="reporting")
  public Reporting reporting() {
    Reporting reporting = new NoReporting();
    return reporting;
  }

  @Bean
  public String hostname() {
    String hostname = LOCALHOST;
    try {
      hostname = InetAddress.getLocalHost().getHostName();
    } catch (Exception ignore) {}
    return hostname;
  }

  @Bean
  public Docket api() {
    return new Docket(DocumentationType.SWAGGER_2)
      .select()
      .apis(RequestHandlerSelectors.any())
      .paths(PathSelectors.any())
      .build()
      .apiInfo(apiInfo());
  }

  private ApiInfo apiInfo() {
    ApiInfo apiInfo = new ApiInfo(
      "Chronos API",
      "Chronos API endpoints",
      "", // API TOS
      "", // Terms of service
      "eng@example.com",
      "",
      ""); // API license URL
    return apiInfo;
  }

  @DependsOn(value={"jobDao","reportRootPath"})
  @Bean(initMethod="init", destroyMethod="close", name="agentConsumer")
  public AgentConsumer consumer() {
    int numOfConcurrentJobs = 4;
    int numOfConcurrentReruns = 10;
    int maxReruns = 5;
    int waitBeforeRetrySeconds = 1200;
    int minAttemptsForNotification = 1;
    AgentConsumer agentConsumer = new AgentConsumer(jobDao(), reporting(), hostname(), mailInfo(),
        relaySession(), drivers(), numOfConcurrentJobs,
        numOfConcurrentReruns, maxReruns, waitBeforeRetrySeconds, minAttemptsForNotification);
    //agentConsumer.writeReportToLocal(reportRootPath()); //uncomment this line to write report to localhost
    return agentConsumer;
  }

  @DependsOn(value="jobDao")
  @Bean(initMethod="init", destroyMethod="close", name="agentDriver")
  public AgentDriver agent() {
    return new AgentDriver(jobDao(), reporting());
  }
 
}
