// Simple live reload for development
(function() {
  if (window.location.hostname !== 'localhost') return;
  
  let lastModified = {};
  
  function checkForUpdates() {
    fetch('/api/health')
      .then(response => {
        if (response.ok) {
          // Server is running, check for file changes
          const files = ['app.js', 'styles.css', 'index.html'];
          
          files.forEach(file => {
            fetch(`/${file}?t=${Date.now()}`, { method: 'HEAD' })
              .then(res => {
                const modified = res.headers.get('last-modified');
                if (lastModified[file] && lastModified[file] !== modified) {
                  console.log(`🔄 ${file} changed, reloading...`);
                  window.location.reload();
                }
                lastModified[file] = modified;
              })
              .catch(() => {});
          });
        }
      })
      .catch(() => {
        // Server might be restarting
        setTimeout(checkForUpdates, 2000);
      });
  }
  
  // Check every 2 seconds in development
  setInterval(checkForUpdates, 2000);
  console.log('🔄 Live reload enabled for development');
})();