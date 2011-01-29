package ggp.website;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import javax.servlet.http.*;

@SuppressWarnings("serial")
public class GGP_WebsiteServlet extends HttpServlet {
    public void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        if (req.getRequestURI().equals("/")) {
            writeStaticPage(resp, "SplashPage.html");
        }
    }
    
    public void writeStaticPage(HttpServletResponse resp, String thePage) throws IOException {
        FileReader fr = new FileReader("root/" + thePage);
        BufferedReader br = new BufferedReader(fr);
        StringBuffer response = new StringBuffer();
        
        String line;
        while( (line = br.readLine()) != null ) {
            response.append(line + "\n");
        }
        
        resp.setContentType("text/html");
        resp.getWriter().println(response.toString());
    }    
}
