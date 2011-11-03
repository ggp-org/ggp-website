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
        if (reqURI.equals("/view")) reqURI += "/";
        if (reqURI.equals("/kiosk")) reqURI += "/";        

        if (reqURI.startsWith("/view/")) {
            // Hooks for the Bellerophon viewer.
            reqURI = rewriteViewURI(reqURI);
            if (reqURI == null) return null;
        }
        
        if (reqURI.endsWith("/")) {
            reqURI += "index.html";
        }        

        if (reqURI.endsWith(".png") || reqURI.endsWith(".ico")) {
            return readBinaryFile(new File(reqURI.substring(1)));
        } else if (reqURI.endsWith(".js")) {
            // TODO: Automatically minify any javascript files we serve.
            return readFile(new File(reqURI.substring(1))).getBytes();
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
    
    // GGP View Rewriter
    private String rewriteViewURI(String reqURI) {
        reqURI = reqURI.replaceFirst("/view/", "");
        if (reqURI.isEmpty())
            return "/viewer/index.html";

        String[] splitURI = reqURI.split("/");
        reqURI = "";
        for (int i = 1; i < splitURI.length; i++) {
            reqURI += "/" + splitURI[i];
        }
        if (reqURI.isEmpty())
            return "/viewer/host.html";            

        if (reqURI.startsWith("/matches")) {
            reqURI = reqURI.replaceFirst("/matches", "");
            if (reqURI.isEmpty())
                return "/viewer/matches/index.html";
            return "/viewer/matches/match.html";
        }
        if (reqURI.startsWith("/games")) {
            reqURI = reqURI.replaceFirst("/games", "");
            if (reqURI.isEmpty())
                return "/viewer/games/index.html";
            return "/viewer/games/game.html";
        }
        if (reqURI.startsWith("/players")) {
            reqURI = reqURI.replaceFirst("/players", "");
            if (reqURI.isEmpty())
                return "/viewer/players/index.html";
            return "/viewer/players/player.html";
        }
        if (reqURI.equals("/stats")) {
            return "/viewer/stats/index.html";
        }
        return null;
    }
}