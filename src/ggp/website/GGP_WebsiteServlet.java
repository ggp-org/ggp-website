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
            writeStaticPage(resp, "root/SplashPage.html");
            resp.setContentType("text/html");
        } else {
            writeStaticPage(resp, req.getRequestURI().substring(1));
            resp.setContentType("application/x-javascript");
        }
    }
    
    public void writeStaticPage(HttpServletResponse resp, String thePage) throws IOException {
        FileReader fr = new FileReader(thePage);
        BufferedReader br = new BufferedReader(fr);
        StringBuffer response = new StringBuffer();
        
        String line;
        while( (line = br.readLine()) != null ) {
            response.append(line + "\n");
        }
                
        resp.getWriter().println(response.toString());
    }    
}
