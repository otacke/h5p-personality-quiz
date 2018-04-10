/** @namespace H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.PersonalityQuiz'] = (function ($) {
  return {
    1: {
      1: function (parameters, finished, extras) {
        // Set new show title parameter
        if (parameters.titleScreen && parameters.titleScreen.title) {
          parameters.titleScreen.showTitle = parameters.titleScreen.title.display;

          // Copy title to new metadata structure if present
          var metadata = {
            title: parameters.titleScreen.title.text || ((extras && extras.metadata) ? extras.metadata.title : undefined)
          };
          extras.metadata = metadata;

          // Remove old parameter
          delete parameters.titleScreen.title.display;
          delete parameters.titleScreen.title.text;
        }
        finished(null, parameters, extras);
      }
    }
  };
})(H5P.jQuery);
