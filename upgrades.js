/* global H5PUpgrades */
H5PUpgrades['H5P.PersonalityQuiz'] = (() => {
  // Avoiding to use H5P.createUUID as H5P function may change
  const createUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(/[xy]/g, (char) => {
        const random = Math.random() * 16 | 0;
        const newChar = (char === 'x') ? random : (random & 0x3 | 0x8);
        return newChar.toString(16);
      });
  };

  return {
    1: {
      /**
       * @param {object} parameters Parameters.
       * @param {function} finished Callback when done.
       * @param {object} extras Extras such as metadata.
       */
      1: (parameters, finished, extras) => {
        if (parameters) {
          // Change title screen
          if (parameters.titleScreen) {
            // Turn title screen text into HTML field
            if (parameters.titleScreen.title?.text) {
              parameters.titleScreen.titleScreenIntroduction =
                `<p style="text-align: center;"><span style="font-size:1.5rem;"><strong>${parameters.titleScreen.title.text}</strong></span></p>`;
            }
            delete parameters.titleScreen.title;

            // Turn image into H5P.Image
            if (parameters.titleScreen.image?.file?.path) {
              parameters.titleScreen.titleScreenMedium = {
                params: {
                  decorative: true,
                  contentName: 'Image',
                  file: parameters.titleScreen.image.file
                },
                library: 'H5P.Image 1.1',
                metadata: { contentType: 'Image' },
                subContentId: createUUID()
              };
            }
            delete parameters.titleScreen.image;

            // Use "show title screen" checkbox as in other content types
            parameters.showTitleScreen = (typeof parameters.titleScreen.skip === 'boolean') ?
              !parameters.skip :
              false;
            delete parameters.titleScreen.skip;
          }

          parameters.personalitiesGroup = {};
          if (parameters.personalities) {
            parameters.personalitiesGroup.personalities =
              parameters.personalities;
            delete parameters.personalities;
          }

          parameters.questionsGroup = {};
          if (parameters.questions) {
            parameters.questionsGroup.questions =
              parameters.questions;
            delete parameters.questions;
          }

          // Visual settings group
          parameters.visual = {
            isAnimationOn: parameters.animation ?? true,
            colorButton: parameters.buttonColor ?? '#1a73d9',
            colorProgressBar: parameters.progressbarColor ?? '#1a73d9'
          };
          delete parameters.animation;
          delete parameters.buttonColor;
          delete parameters.progressbarColor;

          // Hex color code may not have been prefixed with #
          const regExpPlainColorHex = /^[a-fA-F0-9]{6}$|^[a-fA-F0-9]{3}$/;
          if (parameters.visual.colorButton.match(regExpPlainColorHex)) {
            parameters.visual.colorButton =
              `#${parameters.visual.colorButton}`;
          }
          if (parameters.visual.colorProgressBar.match(regExpPlainColorHex)) {
            parameters.visual.colorProgressBar =
              `#${parameters.visual.colorProgressBar}`;
          }

          // l10n
          parameters.l10n = {
            start: parameters.startText ?? 'Start',
            currentOfTotal: (parameters.progressText ?? '@current of @total')
              .replace(/@question/g, '@current'),
            reset: parameters.retakeText ?? 'Retake the quiz'
          };
          delete parameters.startText;
          delete parameters.progressText;
          delete parameters.retakeText;
        }

        finished(null, parameters, extras);
      }
    }
  };
})();
