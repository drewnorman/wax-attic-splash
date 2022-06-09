import {
  Engine,
  Scene,
  Color4,
  ArcRotateCamera,
  FreeCamera,
  StandardMaterial,
  DynamicTexture,
  Mesh,
  Vector3,
  ParticleHelper,
} from 'babylonjs';

const showSpinner = () => {
  const indicator = document.getElementById('loadingIndicator');
  const indicatorInitialText = 'evolving';

  let count = 0;
  indicator.innerText = indicatorInitialText;
  setInterval(() => {
    indicator.innerText += '.';
    count += 1;
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

  const engine = new Engine(canvas);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.196, 0.196, 0.196, 0.0);
  scene.blockMaterialDirtyMechanism = true;

  showSpinner();

  window.onresize = () => engine.resize();

  const mainCamera = new ArcRotateCamera(
    'mainCamera',
    0,
    1.25,
    9,
    new Vector3(0, 0, 0),
    scene,
  );
  mainCamera.lowerRadiusLimit = 9;
  mainCamera.upperRadiusLimit = 9;
  mainCamera.attachControl(canvas, true);

  if (scene.activeCameras.length === 0) {
    scene.activeCameras.push(scene.activeCamera);
  }

  const overlayCamera = new FreeCamera(
    'overlayCamera',
    new Vector3(15, 10.5, -22),
    scene,
  );
  overlayCamera.layerMask = 0x20000000;
  scene.activeCameras.push(overlayCamera);

  const cubeMaterial = new StandardMaterial('cubeMaterial', scene);
  const cubeTextureSize = 1500;
  const cubeTexture = new DynamicTexture('cubeTexture', cubeTextureSize, scene);
  const context = cubeTexture.getContext();
  cubeMaterial.diffuseTexture = cubeTexture;
  cubeMaterial.specularTexture = cubeTexture;
  cubeMaterial.emissiveTexture = cubeTexture;
  cubeMaterial.ambientTexture = cubeTexture;
  cubeMaterial.freeze();

  const image = new Image();
  image.src = 'images/wax-texture.png';
  image.onload = () => {
    context.drawImage(image, 0, 0);
    cubeTexture.update();
  };

  const box = new Mesh.CreateBox('box', 2, scene);
  box.rotation.x = -0.2;
  box.rotation.y = -0.4;
  box.material = cubeMaterial;
  box.doNotSyncBoundingInfo = true;
  box.convertToUnIndexedMesh();

  for (let i = 0; i < 20; i += 1) {
    ParticleHelper.CreateAsync('fire', scene).then((set) => {
      set.start();
      set.systems.forEach((system) => {
        /* eslint-disable no-param-reassign */
        system.worldOffset = new Vector3(i * 2 - 3, 0, 0);
        system.layerMask = 0x20000000;
        /* eslint-enable no-param-reassign */
      });
    });
  }

  scene.executeWhenReady(() => {
    let hue = 0;
    engine.runRenderLoop(() => {
      box.rotation.x += 0.01;
      box.rotation.y += 0.01;

      hue += 0.7;
      if (hue > 360) hue = 0;
      context.clearRect(0, 0, cubeTextureSize, cubeTextureSize);
      context.drawImage(image, 0, 0);
      context.globalCompositeOperation = 'multiply';
      context.fillStyle = `hsl(${hue}, 100%, 50%)`;
      context.fillRect(0, 0, cubeTextureSize, cubeTextureSize);
      context.globalCompositeOperation = 'source-over';
      cubeTexture.update();

      scene.render();
    });
    setTimeout(() => hideSpinner(), 400);
  });
};

export default Game;
