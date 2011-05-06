package ggp.website;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;

import javax.servlet.http.*;

@SuppressWarnings("serial")
public class GGP_WebsiteServlet extends HttpServlet {
    public void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String reqURI = req.getRequestURI();

        if (req.getServerName().equals("kiosk.ggp.org")) {
            resp.setStatus(301);
            resp.setHeader("Location", "http://www.ggp.org/kiosk/");
            return;
        }
        
        if (reqURI.equals("/docs")) reqURI += "/";
        if (reqURI.equals("/kiosk")) reqURI += "/";
        
        if (reqURI.endsWith("/")) {
            reqURI += "index.html";
        }

        boolean writeAsBinary = false;        
        if (reqURI.endsWith(".html")) {
            resp.setContentType("text/html");
        } else if (reqURI.endsWith(".xml")) {
            resp.setContentType("application/xml");
        } else if (reqURI.endsWith(".xsl")) {
            resp.setContentType("application/xml");
        } else if (reqURI.endsWith(".js")) {
            resp.setContentType("text/javascript");   
        } else if (reqURI.endsWith(".json")) {
            resp.setContentType("text/javascript");
        } else if (reqURI.endsWith(".png")) {
            resp.setContentType("image/png");
            writeAsBinary = true;
        } else if (reqURI.endsWith(".ico")) {
            resp.setContentType("image/png");
            writeAsBinary = true;
        } else {
            resp.setContentType("text/plain");
        }

        try {
            if (writeAsBinary) {
                writeStaticBinaryPage(resp, reqURI.substring(1));
            } else {
                // Temporary limits on caching, for during development.
                resp.setHeader("Cache-Control", "no-cache");
                resp.setHeader("Pragma", "no-cache");
                writeStaticTextPage(resp, reqURI.substring(1));
            }
        } catch (IOException e) {
            resp.setStatus(404);
        }
    }

    public void writeStaticTextPage(HttpServletResponse resp, String theURI) throws IOException {
        FileReader fr = new FileReader(theURI);
        BufferedReader br = new BufferedReader(fr);
        StringBuffer response = new StringBuffer();
        
        String line;
        while( (line = br.readLine()) != null ) {
            response.append(line + "\n");
        }
                
        resp.getWriter().println(response.toString());
    }
    
    public void writeStaticBinaryPage(HttpServletResponse resp, String theURI) throws IOException {
        InputStream in = new FileInputStream(theURI);
        byte[] buf = new byte[1024];
        while (in.read(buf) > 0) {
            resp.getOutputStream().write(buf);
        }
        in.close();        
    }
}