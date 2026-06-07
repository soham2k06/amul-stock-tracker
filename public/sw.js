self.addEventListener("push", (event) => {
  if (!event.data) {
    console.log("No payload");
    return;
  }

  let data;

  try {
    data = event.data.json();
    console.log("Payload:", data);
  } catch (error) {
    console.error("JSON parse failed:", error);

    data = {
      title: "Amul Stock Notifier",
      body: event.data.text(),
    };
  }

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(
          data.title ?? "Amul Stock Notifier",
          {
            body: data.body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            data: { url: data.url ?? "/" },
          },
        );

        console.log("Notification shown");
      } catch (error) {
        console.error("showNotification failed", error);
      }
    })(),
  );
});
