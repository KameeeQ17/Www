package pl.wildlands.recent;

import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.event.Listener;
import org.bukkit.event.EventHandler;
import org.bukkit.event.player.PlayerJoinEvent;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.io.InputStream;
import java.io.OutputStream;

/** Read-only endpoint; publishes only five public nicknames, UUIDs and join times. */
public final class WildLandsRecent extends JavaPlugin implements Listener {
  private final List<Entry> recent = new ArrayList<Entry>();
  private volatile byte[] snapshot = "{\"players\":[]}".getBytes(StandardCharsets.UTF_8);
  private HttpServer http;
  private ExecutorService io;
  private Path history;
  private static final class Entry {
    final String name, uuid, joinedAt;
    Entry(String name, String uuid, String time) { this.name=name; this.uuid=uuid; this.joinedAt=time; }
  }
  @Override public void onEnable() {
    saveDefaultConfig();
    history=getDataFolder().toPath().resolve("recent.properties");
    io=Executors.newSingleThreadExecutor();
    loadHistory(); updateSnapshot();
    try {
      http=HttpServer.create(new InetSocketAddress(getConfig().getString("bind-address","0.0.0.0"),getConfig().getInt("port",8085)),8);
      http.createContext("/recent",exchange -> {
        try {
          if(!exchange.getRequestURI().getPath().equals("/recent")) {exchange.sendResponseHeaders(404,-1);return;}
          if(!exchange.getRequestMethod().equals("GET")) {exchange.getResponseHeaders().set("Allow","GET");exchange.sendResponseHeaders(405,-1);return;}
          byte[] data=snapshot;
          exchange.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");
          exchange.getResponseHeaders().set("Cache-Control","public, max-age=15");
          exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");
          exchange.sendResponseHeaders(200,data.length);
          try(OutputStream out=exchange.getResponseBody()){out.write(data);}
        } finally {exchange.close();}
      });
      http.setExecutor(Executors.newFixedThreadPool(2));
      http.start();
      getServer().getPluginManager().registerEvents(this,this);
      getLogger().info("Historia wejsc: port "+getConfig().getInt("port",8085)+", sciezka /recent");
    } catch(Exception error) {
      getLogger().severe("Nie mozna uruchomic endpointu historii. Sprawdz przydzielony port w config.yml: "+error.getMessage());
      getServer().getPluginManager().disablePlugin(this);
    }
  }
  @EventHandler public void onJoin(PlayerJoinEvent event) {
    final String uuid=event.getPlayer().getUniqueId().toString(),name=event.getPlayer().getName();
    if(!name.matches("[A-Za-z0-9_]{1,16}"))return;
    recent.removeIf(entry -> entry.uuid.equals(uuid));
    recent.add(0,new Entry(name,uuid,Instant.now().toString()));
    while(recent.size()>5)recent.remove(recent.size()-1);
    updateSnapshot();
    final List<Entry> copy=new ArrayList<Entry>(recent);
    io.submit(() -> saveHistory(copy));
  }
  private void updateSnapshot() {
    StringBuilder json=new StringBuilder("{\"players\":[");
    for(int i=0;i<recent.size();i++) {
      if(i>0)json.append(',');Entry e=recent.get(i);
      json.append("{\"name\":\"").append(e.name).append("\",\"uuid\":\"").append(e.uuid).append("\",\"joinedAt\":\"").append(e.joinedAt).append("\"}");
    }
    snapshot=json.append("]}").toString().getBytes(StandardCharsets.UTF_8);
  }
  private void loadHistory() {
    if(!Files.exists(history))return;
    Properties props=new Properties();
    try(InputStream in=Files.newInputStream(history)) {
      props.load(in);
      for(int i=0;i<5;i++) {
        String name=props.getProperty(i+".name",""),uuid=props.getProperty(i+".uuid",""),time=props.getProperty(i+".time","");
        if(!name.matches("[A-Za-z0-9_]{1,16}")||!uuid.matches("[a-f0-9-]{36}"))continue;
        try {Instant.parse(time);recent.add(new Entry(name,uuid,time));}catch(Exception ignored){}
      }
    }catch(Exception error){getLogger().warning("Nie udalo sie odczytac historii: "+error.getMessage());}
  }
  private void saveHistory(List<Entry> entries) {
    Properties props=new Properties();
    for(int i=0;i<entries.size();i++){Entry e=entries.get(i);props.setProperty(i+".name",e.name);props.setProperty(i+".uuid",e.uuid);props.setProperty(i+".time",e.joinedAt);}
    try {
      Path temp=history.resolveSibling("recent.properties.tmp");
      try(OutputStream out=Files.newOutputStream(temp)){props.store(out,"WildLands last five joins");}
      Files.move(temp,history,StandardCopyOption.REPLACE_EXISTING);
    }catch(Exception error){getLogger().warning("Nie udalo sie zapisac historii: "+error.getMessage());}
  }
  @Override public void onDisable() {
    if(http!=null){http.stop(0);if(http.getExecutor() instanceof ExecutorService)((ExecutorService)http.getExecutor()).shutdownNow();}
    if(io!=null){io.shutdown();try{if(!io.awaitTermination(3,TimeUnit.SECONDS))io.shutdownNow();}catch(InterruptedException e){Thread.currentThread().interrupt();}}
  }
}
