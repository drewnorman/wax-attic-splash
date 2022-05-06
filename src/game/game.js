import "babylonjs";

export class Game {

  constructor() {
    this._initialize();
  }

  _render() {
    this.box.rotation.x += 0.01;
    this.box.rotation.y += 0.01;
    this.scene.render();
  }

  _initialize() {
    this._initializeGraphics();
    this._setup();
  }

  _handleResize() {
    this.engine.resize();
  }

  _initializeGraphics() {
    this.canvas = document.getElementById("game");

    this.engine = new BABYLON.Engine(this.canvas);
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.196, 0.196, 0.196, 0.0);
    this.scene.blockMaterialDirtyMechanism = true;

    this._animateLoadingIndicator();

    this.scene.executeWhenReady(() => {
      this.engine.runRenderLoop(() => this._render());
      setTimeout(() => {
        document.getElementById("loadingOverlay").style = "display: none;";
      }, 400);
    });

    window.onresize = () => this._handleResize();
  }

  _setup() {
    this._setupCameras();
    this._setupCube();
    this._setupFlames(20);
  }

  _setupCameras() {
    this.mainCamera = new BABYLON.ArcRotateCamera("mainCamera", 0, 1.25, 9, new BABYLON.Vector3(0, 0, 0), this.scene);
    this.mainCamera.lowerRadiusLimit = 9;
    this.mainCamera.upperRadiusLimit = 9;
    this.mainCamera.attachControl(this.canvas, true);

    if (this.scene.activeCameras.length === 0) {
      this.scene.activeCameras.push(this.scene.activeCamera);
    }

    this.overlayCamera = new BABYLON.FreeCamera("overlayCamera", new BABYLON.Vector3(15, 10.5, -22), this.scene);
    this.overlayCamera.layerMask = 0x20000000;
    this.scene.activeCameras.push(this.overlayCamera);
  }

  _setupCube() {
    this.cubeMaterial = new BABYLON.StandardMaterial("cubeMaterial", this.scene);
    this.cubeMaterial.diffuseTexture = new BABYLON.Texture("images/wax-texture.png", this.scene);
    this.cubeMaterial.specularTexture = new BABYLON.Texture("images/wax-texture.png", this.scene);
    this.cubeMaterial.emissiveTexture = new BABYLON.Texture("images/wax-texture.png", this.scene);
    this.cubeMaterial.ambientTexture = new BABYLON.Texture("images/wax-texture.png", this.scene);
    this.cubeMaterial.freeze();

    this.box = new BABYLON.Mesh.CreateBox("box", 2, this.scene);
    this.box.rotation.x = -0.2;
    this.box.rotation.y = -0.4;
    this.box.material = this.cubeMaterial;
    this.box.doNotSyncBoundingInfo = true;
    this.box.convertToUnIndexedMesh();
  }

  _setupFlames(count) {
    for (let i = 0; i < count; i++) {
      BABYLON.ParticleHelper.CreateAsync("fire", this.scene).then((set) => {
        set.start();
        set.systems.forEach(system => {
          system.worldOffset = new BABYLON.Vector3(i * 2 - 3, 0, 0);
          system.layerMask = 0x20000000;
        });
      });
    }
  }

  _animateLoadingIndicator() {
    const indicator = document.getElementById("loadingIndicator");
    const indicatorInitialText = "evolving";

    let count = 0;
    indicator.innerText = indicatorInitialText;
    setInterval(() => {
      indicator.innerText += ".";
      count++;
      if (count > 3) {
        count = 0;
        indicator.innerText = indicatorInitialText;
      }
    }, 200);
  }
}
