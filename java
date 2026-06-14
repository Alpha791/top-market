FileInputStream serviceAccount =
new FileInputStream("path/to/serviceAccountKey.json");

FirebaseOptions options = new FirebaseOptions.Builder()
  .setCredentials(GoogleCredentials.fromStream(serviceAccount))
  .setDatabaseUrl("https://best-market-d2ef0-default-rtdb.asia-southeast1.firebasedatabase.app")
  .build();

FirebaseApp.initializeApp(options);
