package ggp.website;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;

@SuppressWarnings("serial")
public class GGP_WebsiteServlet extends CachedStaticServlet {
    @Override
    protected byte[] getResponseBytesForURI(String reqURI) throws IOException {
        if (reqURI.equals("/docs")) reqURI += "/";
        if (reqURI.equals("/kiosk")) reqURI += "/";
        
        if (reqURI.endsWith("/")) {
            reqURI += "index.html";
        }

        if (reqURI.endsWith(".png") || reqURI.endsWith(".ico")) {
            return readBinaryFile(new File(reqURI.substring(1)));
        } else {
            return readFile(new File(reqURI.substring(1))).getBytes();
        }
    }

    private static String readFile(File rootFile) throws IOException {
        // Show contents of the file.                                        
        FileReader fr = new FileReader(rootFile);
        BufferedReader br = new BufferedReader(fr);
        
        String response = "";
        String line;
        while( (line = br.readLine()) != null ) {
            response += line + "\n";
        }
        
        return response;
    }
    
    private static byte[] readBinaryFile(File rootFile) throws IOException {
        InputStream in = new FileInputStream(rootFile);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        
        // Transfer bytes from in to out
        byte[] buf = new byte[1024];
        while (in.read(buf) > 0) {
            out.write(buf);
        }
        in.close();
        
        return out.toByteArray();
    }
}