(function(){
  if (window.__test_plugin_loaded__) return;
  window.__test_plugin_loaded__ = true;

  Lampa.Listener && Lampa.Listener.follow('app', function(e){
    if (e.type === 'ready') {
      Lampa.Noty.show('Test plugin loaded from linkQNE');
      console.log('Test plugin OK');
    }
  });
})();
