import 'babylonjs';

const showSpinner = () => {
  const indicator = document.getElementById('loadingIndicator');
  const indicatorInitialText = 'evolving';

  let count = 0;
  indicator.innerText = indicatorInitialText;
  setInterval(() => {
    indicator.innerText += '.';
    count++;
    if (count > 3) {
      count = 0;
      indicator.innerText = indicatorInitialText;
    }
  }, 200);
};

const hideSpinner = () => {
  document.getElementById('loadingOverlay').style = 'display: none;';
};

const Game = () => {
  const canvas = document.getElementById('game');

  const engine = new BABYLON.Engine(canvas);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.196, 0.196, 0.196, 0.0);
  scene.blockMaterialDirtyMechanism = true;

  showSpinner();

  scene.executeWhenReady(() => {
    engine.runRenderLoop(() => {
      box.rotation.x += 0.01;
      box.rotation.y += 0.01;
      scene.render();
    });
    setTimeout(() => hideSpinner(), 400);
  });

  window.onresize = () => engine.resize();

  const mainCamera = new BABYLON.ArcRotateCamera(
    'mainCamera',
    0,
    1.25,
    9,
    new BABYLON.Vector3(0, 0, 0),
    scene
  );
  mainCamera.lowerRadiusLimit = 9;
  mainCamera.upperRadiusLimit = 9;
  mainCamera.attachControl(canvas, true);

  if (scene.activeCameras.length === 0) {
    scene.activeCameras.push(scene.activeCamera);
  }

  const overlayCamera = new BABYLON.FreeCamera(
    'overlayCamera',
    new BABYLON.Vector3(15, 10.5, -22),
    scene
  );
  overlayCamera.layerMask = 0x20000000;
  scene.activeCameras.push(overlayCamera);

  const cubeMaterial = new BABYLON.StandardMaterial('cubeMaterial', scene);
  const cubeTexture = new BABYLON.Texture('images/wax-texture.png', scene);
  cubeMaterial.diffuseTexture = cubeTexture;
  cubeMaterial.specularTexture = cubeTexture;
  cubeMaterial.emissiveTexture = cubeTexture;
  cubeMaterial.ambientTexture = cubeTexture;
  cubeMaterial.freeze();

  const box = new BABYLON.Mesh.CreateBox('box', 2, scene);
  box.rotation.x = -0.2;
  box.rotation.y = -0.4;
  box.material = cubeMaterial;
  box.doNotSyncBoundingInfo = true;
  box.convertToUnIndexedMesh();

  for (let i = 0; i < 20; i++) {
    BABYLON.ParticleHelper.CreateAsync('fire', scene).then((set) => {
      set.start();
      set.systems.forEach(system => {
        system.worldOffset = new BABYLON.Vector3(i * 2 - 3, 0, 0);
        system.layerMask = 0x20000000;
      });
    });
  }
};

export default Game;
