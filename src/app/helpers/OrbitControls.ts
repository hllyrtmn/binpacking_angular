// src/app/helpers/OrbitControls.ts
import {
  Camera,
  EventDispatcher,
  MOUSE,
  Quaternion,
  Spherical,
  TOUCH,
  Vector2,
  Vector3,
  Vector4,
  PerspectiveCamera,
  OrthographicCamera,
  Matrix4
} from 'three';

/**
 * Basitleştirilmiş OrbitControls sınıfı
 * Three.js ile uyumlu, TypeScript için uyarlanmış
 */
export class OrbitControls extends EventDispatcher {
  object: Camera;
  domElement: HTMLElement;

  // Kontrol özellikleri
  enabled: boolean = true;
  target: Vector3 = new Vector3();

  // Zoom özellikleri
  minDistance: number = 0;
  maxDistance: number = Infinity;
  enableZoom: boolean = true;
  zoomSpeed: number = 1.0;

  // Rotation özellikleri
  enableRotate: boolean = true;
  rotateSpeed: number = 1.0;

  // Pan özellikleri
  enablePan: boolean = true;
  panSpeed: number = 1.0;

  // Damping
  enableDamping: boolean = false;
  dampingFactor: number = 0.05;

  // Screen space panning
  screenSpacePanning: boolean = true;

  // Polar açı sınırları
  minPolarAngle: number = 0;
  maxPolarAngle: number = Math.PI;

  // Azimuth açı sınırları
  minAzimuthAngle: number = -Infinity;
  maxAzimuthAngle: number = Infinity;

  // Auto rotate
  autoRotate: boolean = false;
  autoRotateSpeed: number = 2.0;

  // Keyboard and keys
  enableKeys: boolean = true;
  keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };

  // Diğer değişkenler
  private STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_PAN: 4,
    TOUCH_DOLLY_PAN: 5,
    TOUCH_DOLLY_ROTATE: 6
  };

  private boundContextMenuHandler: any;
  private boundPointerDownHandler: any;
  private boundPointerCancelHandler: any;
  private boundMouseWheelHandler: any;
  private boundPointerMoveHandler: any;
  private boundPointerUpHandler: any;
  private boundWindowResizeHandler: any;

  private state: number = -1;
  private EPS: number = 0.000001;

  private spherical: Spherical = new Spherical();
  private sphericalDelta: Spherical = new Spherical();

  private scale: number = 1;
  private panOffset: Vector3 = new Vector3();
  private zoomChanged: boolean = false;

  private rotateStart: Vector2 = new Vector2();
  private rotateEnd: Vector2 = new Vector2();
  private rotateDelta: Vector2 = new Vector2();

  private panStart: Vector2 = new Vector2();
  private panEnd: Vector2 = new Vector2();
  private panDelta: Vector2 = new Vector2();

  private dollyStart: Vector2 = new Vector2();
  private dollyEnd: Vector2 = new Vector2();
  private dollyDelta: Vector2 = new Vector2();

  private pointers: PointerEvent[] = [];
  private pointerPositions: {[key: string]: Vector2} = {};

  constructor(object: Camera, domElement: HTMLElement) {
    super();

  this.object = object;
  this.domElement = domElement;

  // Bound methods oluştur
  this.boundContextMenuHandler = this.onContextMenu.bind(this);
  this.boundPointerDownHandler = this.onPointerDown.bind(this);
  this.boundPointerCancelHandler = this.onPointerCancel.bind(this);
  this.boundMouseWheelHandler = this.onMouseWheel.bind(this);
  this.boundPointerMoveHandler = this.onPointerMove.bind(this);
  this.boundPointerUpHandler = this.onPointerUp.bind(this);
  this.boundWindowResizeHandler = this.onWindowResize.bind(this);

  // DOM elementinin tabindex özelliği yoksa, klavye olaylarını yakalayabilmek için ekliyoruz
  if (this.domElement.tabIndex === -1) {
    this.domElement.tabIndex = 0;
  }

  // Olay dinleyicileri
  this.domElement.addEventListener('contextmenu', this.boundContextMenuHandler);
  this.domElement.addEventListener('pointerdown', this.boundPointerDownHandler);
  this.domElement.addEventListener('pointercancel', this.boundPointerCancelHandler);
  this.domElement.addEventListener('wheel', this.boundMouseWheelHandler, { passive: false });

  // Pencere boyutu değişikliği
  window.addEventListener('resize', this.boundWindowResizeHandler);

  // İlk durumu ayarla
  this.update();
  }

  // Pencere yeniden boyutlandırma olayı
  private onWindowResize(): void {
    if (this.object instanceof PerspectiveCamera) {
      const element = this.domElement;
      const camera = this.object;

      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
    }
  }

  // Sağ tık menüsünü engelleme
  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  // Fare/dokunmatik olayları
  private onPointerDown(event: PointerEvent): void {
    if (!this.enabled) return;

    // Pointer olayını takip et
    this.addPointer(event);

    if (event.pointerType === 'touch') {
      this.onTouchStart(event);
    } else {
      this.onMouseDown(event);
    }

    // Durum değiştiyse gereken olay dinleyicilerini ekle
    if (this.state !== this.STATE.NONE) {
      document.addEventListener('pointermove', this.boundPointerMoveHandler);
      document.addEventListener('pointerup', this.boundPointerUpHandler);
    }
  }

  private onMouseDown(event: PointerEvent): void {
    // Butonlara göre durumu belirle
    switch (event.button) {
      case 0: // Sol tık
        this.state = this.STATE.ROTATE;
        this.rotateStart.set(event.clientX, event.clientY);
        break;
      case 1: // Orta tık
        this.state = this.STATE.DOLLY;
        this.dollyStart.set(event.clientX, event.clientY);
        break;
      case 2: // Sağ tık
        this.state = this.STATE.PAN;
        this.panStart.set(event.clientX, event.clientY);
        break;
    }

    // Durum değiştiyse gereken olay dinleyicilerini ekle
    if (this.state !== this.STATE.NONE) {
      document.addEventListener('pointermove', this.onPointerMove.bind(this));
      document.addEventListener('pointerup', this.onPointerUp.bind(this));
    }
  }

  private onTouchStart(event: PointerEvent): void {
    // Dokunma noktaları sayısına göre işlem yap
    switch (this.pointers.length) {
      case 1: // Tek parmak
        this.state = this.STATE.TOUCH_ROTATE;
        this.rotateStart.set(event.clientX, event.clientY);
        break;
      case 2: // İki parmak
        // İki parmakla yakınlaştırma ve kaydırma
        this.state = this.STATE.TOUCH_DOLLY_PAN;
        const dx = event.clientX - this.pointers[0].clientX;
        const dy = event.clientY - this.pointers[0].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.dollyStart.set(0, distance);
        // Orta nokta hesabı
        const x = (event.clientX + this.pointers[0].clientX) * 0.5;
        const y = (event.clientY + this.pointers[0].clientY) * 0.5;
        this.panStart.set(x, y);
        break;
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.enabled) return;

    // Pointer pozisyonunu güncelle
    this.updatePointer(event);

    if (event.pointerType === 'touch') {
      this.onTouchMove(event);
    } else {
      this.onMouseMove(event);
    }
  }

  private onMouseMove(event: PointerEvent): void {
    // Mevcut duruma göre işlem yap
    switch (this.state) {
      case this.STATE.ROTATE:
        if (!this.enableRotate) return;
        this.rotateEnd.set(event.clientX, event.clientY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
        // Ekranın yüksekliğine göre ölçeklendirme yap
        const element = this.domElement;
        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight * this.rotateSpeed);
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);
        this.rotateStart.copy(this.rotateEnd);
        break;
      case this.STATE.DOLLY:
        if (!this.enableZoom) return;
        this.dollyEnd.set(event.clientX, event.clientY);
        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
        if (this.dollyDelta.y > 0) {
          this.dollyOut(this.getZoomScale());
        } else if (this.dollyDelta.y < 0) {
          this.dollyIn(this.getZoomScale());
        }
        this.dollyStart.copy(this.dollyEnd);
        break;
      case this.STATE.PAN:
        if (!this.enablePan) return;
        this.panEnd.set(event.clientX, event.clientY);
        this.panDelta.subVectors(this.panEnd, this.panStart);
        this.pan(this.panDelta.x, this.panDelta.y);
        this.panStart.copy(this.panEnd);
        break;
    }
  }

  private onTouchMove(event: PointerEvent): void {
    // Dokunma hareketi durumuna göre işlem yap
    switch (this.state) {
      case this.STATE.TOUCH_ROTATE:
        if (!this.enableRotate) return;
        this.rotateEnd.set(event.clientX, event.clientY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
        const element = this.domElement;
        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight * this.rotateSpeed);
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);
        this.rotateStart.copy(this.rotateEnd);
        break;
      case this.STATE.TOUCH_DOLLY_PAN:
        if (!this.enableZoom && !this.enablePan) return;

        // İki parmakla yakınlaştırma
        if (this.enableZoom && this.pointers.length === 2) {
          const dx = event.clientX - this.pointers[0].clientX;
          const dy = event.clientY - this.pointers[0].clientY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          this.dollyEnd.set(0, distance);
          this.dollyDelta.set(0, Math.pow(this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed));
          this.dollyOut(this.dollyDelta.y);
          this.dollyStart.copy(this.dollyEnd);
        }

        // İki parmakla kaydırma
        if (this.enablePan && this.pointers.length === 2) {
          const x = (event.clientX + this.pointers[0].clientX) * 0.5;
          const y = (event.clientY + this.pointers[0].clientY) * 0.5;

          this.panEnd.set(x, y);
          this.panDelta.subVectors(this.panEnd, this.panStart);
          this.pan(this.panDelta.x, this.panDelta.y);
          this.panStart.copy(this.panEnd);
        }
        break;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    this.removePointer(event);

    if (this.pointers.length === 0) {
      // Tüm pointerlar kaldırıldığında olay dinleyicilerini temizle
      this.domElement.releasePointerCapture(event.pointerId);
      document.removeEventListener('pointermove', this.onPointerMove.bind(this));
      document.removeEventListener('pointerup', this.onPointerUp.bind(this));
      this.state = this.STATE.NONE;
    } else {
      // Geriye kalan pointerların durumunu güncelle
      const touches = this.pointers.length;
      if (touches === 1) {
        this.state = this.STATE.TOUCH_ROTATE;
      } else if (touches === 2) {
        this.state = this.STATE.TOUCH_DOLLY_PAN;
      }
    }
  }

  private onPointerCancel(event: PointerEvent): void {
    this.removePointer(event);
  }

  private onMouseWheel(event: WheelEvent): void {
    if (!this.enabled || !this.enableZoom) return;

    event.preventDefault();

    if (event.deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    }
  }

  // Pointer yönetimi metodları
  private addPointer(event: PointerEvent): void {
    this.pointers.push(event);
    this.pointerPositions[event.pointerId] = new Vector2(event.clientX, event.clientY);
  }

  private removePointer(event: PointerEvent): void {
    // Pointeri arrayden kaldır
    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId === event.pointerId) {
        this.pointers.splice(i, 1);
        break;
      }
    }

    delete this.pointerPositions[event.pointerId];
  }

  private updatePointer(event: PointerEvent): void {
    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId === event.pointerId) {
        this.pointers[i] = event;
        break;
      }
    }

    this.pointerPositions[event.pointerId] = new Vector2(event.clientX, event.clientY);
  }

  // Kontrol metodları
  private getZoomScale(): number {
    return Math.pow(0.95, this.zoomSpeed);
  }

  private rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }

  private rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
  }

  private dollyIn(dollyScale: number): void {
    if (this.object instanceof PerspectiveCamera) {
      this.scale /= dollyScale;
    } else if (this.object instanceof OrthographicCamera) {
      this.object.zoom = Math.max(this.minDistance, Math.min(this.maxDistance, this.object.zoom * dollyScale));
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;
    } else {
      console.warn('OrbitControls: Unsupported camera type');
    }
  }

  private dollyOut(dollyScale: number): void {
    if (this.object instanceof PerspectiveCamera) {
      this.scale *= dollyScale;
    } else if (this.object instanceof OrthographicCamera) {
      this.object.zoom = Math.max(this.minDistance, Math.min(this.maxDistance, this.object.zoom / dollyScale));
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;
    } else {
      console.warn('OrbitControls: Unsupported camera type');
    }
  }

  private pan(deltaX: number, deltaY: number): void {
    const element = this.domElement;

    if (this.object instanceof PerspectiveCamera) {
      // Perspektif için pan hesabı
      const position = this.object.position;
      const offset = position.clone().sub(this.target);
      let targetDistance = offset.length();

      // Field of view hesabını ekle
      targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

      // Sol/sağ paneleme
      this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.object.matrix);

      // Yukarı/aşağı paneleme
      this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.object.matrix);
    } else if (this.object instanceof OrthographicCamera) {
      // Ortografik kamera için pan hesabı
      const camera = this.object;
      const panLeft = deltaX * (camera.right - camera.left) / camera.zoom / element.clientWidth;
      const panUp = deltaY * (camera.top - camera.bottom) / camera.zoom / element.clientHeight;

      this.panLeft(panLeft, this.object.matrix);
      this.panUp(panUp, this.object.matrix);
    } else {
      console.warn('OrbitControls: Unsupported camera type');
    }
  }

  private panLeft(distance: number, objectMatrix: Matrix4): void {
    const v = new Vector3();
    v.setFromMatrixColumn(objectMatrix, 0); // X kolonunu al
    v.multiplyScalar(-distance);
    this.panOffset.add(v);
  }

  private panUp(distance: number, objectMatrix: Matrix4): void {
    const v = new Vector3();

    if (this.screenSpacePanning) {
      v.setFromMatrixColumn(objectMatrix, 1); // Y kolonunu al
    } else {
      v.setFromMatrixColumn(objectMatrix, 0); // X kolonunu al
      v.crossVectors(this.object.up, v); // Dünya yukarı vektörü ile çarpraz çarpım
    }

    v.multiplyScalar(distance);
    this.panOffset.add(v);
  }

  // Ana güncelleme metodu
  public update(): boolean {
    // Kamera ve target kontrolü
    if (!this.object || !this.target) {
      console.warn('OrbitControls: Camera or target is undefined');
    return false;
  }
    const offset = new Vector3();
    const quat = new Quaternion().setFromUnitVectors(this.object.up, new Vector3(0, 1, 0));
    const quatInverse = quat.clone().invert();

    const position = this.object.position;

    offset.copy(position).sub(this.target);
    offset.applyQuaternion(quat); // Kamera alanına dönüştürme

    // Küresel koordinatları hesapla
    this.spherical.setFromVector3(offset);

    // Otomatik dönüş ekleme
    if (this.autoRotate && this.state === this.STATE.NONE) {
      this.rotateLeft(this.getAutoRotationAngle());
    }

    // Kullanıcı tarafından yapılan dönüş
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // Açı sınırlarını uygula
    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
    this.spherical.makeSafe();

    // Mesafeyi güncelle
    this.spherical.radius *= this.scale;

    // Mesafe sınırlarını uygula
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    // Target pozisyonunu kaydırma ile güncelle
    this.target.add(this.panOffset);

    // Küresel koordinatlardan offset vektörü hesapla
    offset.setFromSpherical(this.spherical);

    // Kamera alanından dünya alanına dönüştür
    offset.applyQuaternion(quatInverse);

    // Yeni kamera pozisyonunu hesapla
    position.copy(this.target).add(offset);

    // Kamerayı hedefe bakacak şekilde döndür
    this.object.lookAt(this.target);

    // Damping etkisi (yumuşak hareket)
    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);
      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }

    // Ölçeği sıfırla
    this.scale = 1;

    // Değişiklik olup olmadığını dön
    const changed = this.zoomChanged ||
                    this.sphericalDelta.theta !== 0 ||
                    this.sphericalDelta.phi !== 0 ||
                    this.panOffset.x !== 0 ||
                    this.panOffset.y !== 0 ||
                    this.panOffset.z !== 0;

    this.zoomChanged = false;

    return changed;
  }

  private getAutoRotationAngle(): number {
    return (2 * Math.PI / 60 / 60) * this.autoRotateSpeed;
  }

  // Kaynakları temizleme
  public dispose(): void {
    // Tüm event listener'ları temizle - şimdi doğru bound fonksiyonlarla
    this.domElement.removeEventListener('contextmenu', this.boundContextMenuHandler);
    this.domElement.removeEventListener('pointerdown', this.boundPointerDownHandler);
    this.domElement.removeEventListener('pointercancel', this.boundPointerCancelHandler);
    this.domElement.removeEventListener('wheel', this.boundMouseWheelHandler);

    document.removeEventListener('pointermove', this.boundPointerMoveHandler);
    document.removeEventListener('pointerup', this.boundPointerUpHandler);

    window.removeEventListener('resize', this.boundWindowResizeHandler);

    // Pointer dizisini temizle
    this.pointers = [];
    this.pointerPositions = {};
  }
}
