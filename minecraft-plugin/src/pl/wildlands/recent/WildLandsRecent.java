package pl.wildlands.recent;

import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.event.Listener;
import org.bukkit.event.EventHandler;
import org.bukkit.event.player.PlayerJoinEvent;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.io.InputStream;
import java.io.OutputStream;

/** Outbound HTTPS only; never binds a listening port. Install on one lobby. */
public final class WildLandsRecent extends JavaPlugin implements Listener {
  private final List<Entry> recent = new ArrayList<Entry>();
  private volatile Snapshot snapshot;
  private volatile Snapshot sent;
  private ScheduledExecutorService io;
  private Path history;
  private URL endpoint;
  private String secret;
  private boolean connected;
  private long lastWarning;
  private static final class Entry {
    final String name, uuid, joinedAt;
    Entry(String name,String uuid,String time){this.name=name;this.uuid=uuid;this.joinedAt=time;}
  }
  private static final class Snapshot {
    final byte[] json;
    final List<Entry> entries;
    Snapshot(byte[] json,List<Entry> entries){this.json=json;this.entries=entries;}
  }
  @Override public void onEnable() {
    saveDefaultConfig();
    secret=getConfig().getString("secret","").trim();
    if(secret.length()<32||secret.startsWith("WPISZ-")) {
      getLogger().severe("Ustaw klucz secret z nowego config.yml. Ten sam klucz dodaj w Vercel jako RECENT_PLAYERS_SECRET. Stare port i bind-address nie sa juz uzywane.");
      getServer().getPluginManager().disablePlugin(this);return;
    }
    try {
      endpoint=new URL(getConfig().getString("endpoint","https://www.wildlands.pl/api/recent"));
      if(!endpoint.getProtocol().equals("https")||!endpoint.getHost().equals("www.wildlands.pl")||!endpoint.getPath().equals("/api/recent")||endpoint.getUserInfo()!=null||endpoint.getQuery()!=null||(endpoint.getPort()!=-1&&endpoint.getPort()!=443))throw new Exception();
    }catch(Exception e){getLogger().severe("Endpoint musi miec wartosc https://www.wildlands.pl/api/recent");getServer().getPluginManager().disablePlugin(this);return;}
    history=getDataFolder().toPath().resolve("recent.properties");
    loadHistory();updateSnapshot();
    io=Executors.newSingleThreadScheduledExecutor();
    io.scheduleWithFixedDelay(() -> sync(),5,60,TimeUnit.SECONDS);
    getServer().getPluginManager().registerEvents(this,this);
    getLogger().info("Tryb HTTPS aktywny. Nie jest otwierany zaden port. Wysylka zmian co okolo 60 sekund.");
  }
  @EventHandler public void onJoin(PlayerJoinEvent event) {
    String uuid=event.getPlayer().getUniqueId().toString(),name=event.getPlayer().getName();
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
    snapshot=new Snapshot(json.append("]}").toString().getBytes(StandardCharsets.UTF_8),new ArrayList<Entry>(recent));
  }
  private void sync() {
    Snapshot current=snapshot;
    if(current==null||current==sent)return;
    HttpsURLConnection connection=null;
    try {
      saveHistory(current.entries);
      connection=(HttpsURLConnection)endpoint.openConnection();
      connection.setRequestMethod("POST");connection.setInstanceFollowRedirects(false);
      connection.setConnectTimeout(8000);connection.setReadTimeout(35000);
      connection.setRequestProperty("Content-Type","application/json; charset=utf-8");
      connection.setRequestProperty("Authorization","Bearer "+secret);
      connection.setRequestProperty("User-Agent","WildLandsRecent/2.0");
      connection.setDoOutput(true);connection.setFixedLengthStreamingMode(current.json.length);
      try(OutputStream out=connection.getOutputStream()){out.write(current.json);}
      int status=connection.getResponseCode();
      // Consume only a bounded response. Never print headers, keys, or response bodies.
      InputStream response=status>=400?connection.getErrorStream():connection.getInputStream();
      if(response!=null)try(InputStream in=response){byte[] b=new byte[512];int total=0,n;while(total<4096&&(n=in.read(b))!=-1)total+=n;}
      if(status>=200&&status<300){sent=current;if(!connected){getLogger().info("Polaczono ze strona. Historia lobby zostala przeslana.");connected=true;}}
      else warn("HTTP "+status+". 401: sprawdz secret; 503: zmienne w Vercel; 502: GITHUB_TOKEN. Ponowna proba za okolo minute.");
    }catch(Exception e){warn("Nie udalo sie wyslac historii przez HTTPS. Sprawdz dostep hostingu do www.wildlands.pl:443. Ponowna proba za okolo minute.");}
    finally{if(connection!=null)connection.disconnect();}
  }
  private void warn(String text){long now=System.currentTimeMillis();if(now-lastWarning>300000){getLogger().warning(text);lastWarning=now;}}
  private void loadHistory() {
    if(!Files.exists(history))return;Properties props=new Properties();
    try(InputStream in=Files.newInputStream(history)) {
      props.load(in);
      for(int i=0;i<5;i++) {
        String name=props.getProperty(i+".name",""),uuid=props.getProperty(i+".uuid",""),time=props.getProperty(i+".time","");
        if(!name.matches("[A-Za-z0-9_]{1,16}")||!uuid.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"))continue;
        try {Instant.parse(time);recent.add(new Entry(name,uuid,Instant.parse(time).toString()));}catch(Exception ignored){}
      }
    }catch(Exception e){getLogger().warning("Nie udalo sie odczytac lokalnej historii.");}
  }
  private void saveHistory(List<Entry> entries) {
    Properties props=new Properties();
    for(int i=0;i<entries.size();i++){Entry e=entries.get(i);props.setProperty(i+".name",e.name);props.setProperty(i+".uuid",e.uuid);props.setProperty(i+".time",e.joinedAt);}
    try {
      Path temp=history.resolveSibling("recent.properties.tmp");
      try(OutputStream out=Files.newOutputStream(temp)){props.store(out,"WildLands last five lobby joins");}
      Files.move(temp,history,StandardCopyOption.REPLACE_EXISTING);
    }catch(Exception e){getLogger().warning("Nie udalo sie zapisac lokalnej historii.");}
  }
  @Override public void onDisable() {
    if(io!=null){io.shutdownNow();try{io.awaitTermination(2,TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}}
  }
}
