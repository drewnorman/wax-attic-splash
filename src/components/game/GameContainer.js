import React, { useEffect } from 'react';
import { Game } from '../../game/game';

const GameContainer = () => {
  useEffect(() => {
    new Game();
  }, []);

  return (
    <div id="game-container">
      <canvas id="game"
              style={{
                backgroundImage: 'url(/images/statik.gif)',
                backgroundRepeat: 'repeat',
                backgroundSize: 'auto 50vh',
                backgroundPosition: 'center'
              }}
      />
      <a id="enterSite" href="https://waxattic.com">shop &#62;</a>
      <div id="loadingOverlay">
        <span id="loadingIndicator"/>
      </div>
    </div>
  );
};

export default GameContainer;
