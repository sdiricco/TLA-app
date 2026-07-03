<script setup lang="ts">
  import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
  import Button from 'primevue/button';
  import Message from 'primevue/message';
  import Cropper from 'cropperjs';

  /**
   * Interfaces
   */
  interface Props {
    modelValue?: string | null;
  }

  /**
   * Constants
   */
  const cropTemplate =
    '<cropper-canvas background>' +
    '<cropper-image rotatable scalable skewable translatable></cropper-image>' +
    '<cropper-shade hidden></cropper-shade>' +
    '<cropper-handle action="select" plain></cropper-handle>' +
    '<cropper-selection initial-coverage="0.8" aspect-ratio="1" movable resizable>' +
    '<cropper-grid role="grid" bordered covered></cropper-grid>' +
    '<cropper-crosshair centered></cropper-crosshair>' +
    '<cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>' +
    '<cropper-handle action="n-resize"></cropper-handle>' +
    '<cropper-handle action="e-resize"></cropper-handle>' +
    '<cropper-handle action="s-resize"></cropper-handle>' +
    '<cropper-handle action="w-resize"></cropper-handle>' +
    '<cropper-handle action="ne-resize"></cropper-handle>' +
    '<cropper-handle action="nw-resize"></cropper-handle>' +
    '<cropper-handle action="se-resize"></cropper-handle>' +
    '<cropper-handle action="sw-resize"></cropper-handle>' +
    '</cropper-selection>' +
    '</cropper-canvas>';

  /**
   * Props / Emits
   */
  const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
  });
  const emit = defineEmits<{
    (event: 'update:modelValue', value: string | null): void;
  }>();

  /**
   * Reactive vars
   */
  const fileInput = ref<HTMLInputElement | null>(null);
  const cropperHost = ref<HTMLDivElement | null>(null);
  const errorMessage = ref<string | null>(null);
  const editorVisible = ref(false);
  const pendingFileName = ref('');
  const pendingObjectUrl = ref<string | null>(null);
  const cropper = ref<Cropper | null>(null);

  /**
   * Function: Open file picker
   */
  function openFilePicker(): void {
    fileInput.value?.click();
  }

  /**
   * Function: Close and cleanup cropper instance
   */
  function destroyCropper(): void {
    cropper.value?.destroy();
    cropper.value = null;
  }

  /**
   * Function: Release the temporary object URL created for the selected file
   */
  function revokePendingSource(): void {
    if (!pendingObjectUrl.value) return;
    URL.revokeObjectURL(pendingObjectUrl.value);
    pendingObjectUrl.value = null;
  }

  /**
   * Function: Reset the editor state
   */
  function resetEditor(): void {
    destroyCropper();
    editorVisible.value = false;
    pendingFileName.value = '';
    revokePendingSource();
  }

  /**
   * Function: Build the cropper instance when the source image is ready
   */
  async function mountCropper(source: string): Promise<void> {
    destroyCropper();

    const image = new Image();
    image.src = source;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Immagine non valida'));
    });

    await nextTick();
    if (!cropperHost.value) return;

    cropper.value = new Cropper(image, {
      container: cropperHost.value,
      template: cropTemplate,
    });
  }

  /**
   * Function: Handle file selection
   */
  async function handleFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      errorMessage.value = 'Seleziona un file immagine valido.';
      return;
    }

    errorMessage.value = null;
    revokePendingSource();

    const objectUrl = URL.createObjectURL(file);
    pendingObjectUrl.value = objectUrl;
    pendingFileName.value = file.name;
    editorVisible.value = true;

    try {
      await mountCropper(objectUrl);
    } catch {
      errorMessage.value = 'Impossibile leggere l’immagine selezionata.';
      resetEditor();
    }
  }

  /**
   * Function: Apply the current crop and emit the final image
   */
  async function applyCrop(): Promise<void> {
    if (!cropper.value) return;

    const cropperCanvas = cropper.value.getCropperCanvas();
    if (!cropperCanvas) {
      errorMessage.value = 'Impossibile preparare il ritaglio.';
      return;
    }

    const canvas = await cropperCanvas.$toCanvas({
      width: 512,
      height: 512,
      beforeDraw(context, outputCanvas) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      },
    });

    emit('update:modelValue', canvas.toDataURL('image/jpeg', 0.92));
    resetEditor();
  }

  /**
   * Function: Remove the current photo from the form
   */
  function clearPhoto(): void {
    emit('update:modelValue', null);
    errorMessage.value = null;
  }

  /**
   * Function: Cancel the crop flow
   */
  function cancelCrop(): void {
    errorMessage.value = null;
    resetEditor();
  }

  watch(
    () => props.modelValue,
    (value) => {
      if (!value) {
        errorMessage.value = null;
      }
    }
  );

  onBeforeUnmount(() => {
    destroyCropper();
    revokePendingSource();
  });
</script>

<template>
  <div class="photo-picker">
        <div class="photo-preview">
            <img
              v-if="props.modelValue"
              :src="props.modelValue"
              alt="Anteprima foto profilo"
              class="preview-image"
            />
            <div v-else class="empty-preview">
              <i class="pi pi-image text-2xl" />
              <span class="text-xs">Nessuna foto</span>
            </div>
        </div>

        <div class="photo-copy">
            <p>
              Carica una foto nitida del giocatore. Potrai ritagliarla in formato quadrato prima del salvataggio.
            </p>
            <span class="photo-hint">JPG, PNG o WEBP · ritaglio 1:1</span>
            <div class="photo-actions">
              <Button
                class="upload-button"
                type="button"
                label="Carica immagine"
                icon="pi pi-upload"
                size="small"
                @click="openFilePicker"
              />
              <Button
                type="button"
                label="Rimuovi"
                icon="pi pi-trash"
                size="small"
                severity="secondary"
                outlined
                :disabled="!props.modelValue"
                @click="clearPhoto"
              />
            </div>
        </div>

    <Message v-if="errorMessage" severity="warn" :closable="false">
      {{ errorMessage }}
    </Message>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
  </div>

  <section v-if="editorVisible" class="crop-editor">
        <div class="crop-header">
          <div>
            <div>Ritaglia immagine</div>
            <p>
              Trascina e ridimensiona il riquadro per adattare la foto prima di confermare.
            </p>
          </div>
          <Button label="Annulla" severity="secondary" outlined size="small" @click="cancelCrop" />
        </div>

        <div class="crop-stage">
          <div ref="cropperHost" class="cropper-host" />
        </div>

        <div class="crop-meta">
          <span>{{ pendingFileName }}</span>
          <span>Crop quadrato 1:1</span>
        </div>

        <div class="crop-actions">
          <Button label="Annulla" severity="secondary" outlined @click="cancelCrop" />
          <Button label="Applica ritaglio" @click="applyCrop" />
        </div>
  </section>
</template>

<style scoped>
.photo-picker { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 1rem; padding: 1rem; border: 1px dashed #cbdad4; border-radius: 14px; background: #f9fcfb; }
.photo-preview { position: relative; display: grid; place-items: center; width: 6.5rem; height: 6.5rem; overflow: hidden; border: 3px solid white; border-radius: 50%; background: #e7efec; box-shadow: 0 5px 16px rgb(31 66 52 / 12%); }
.preview-image { width: 100%; height: 100%; object-fit: cover; }
.empty-preview { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; color: #8c9a94; text-align: center; }
.empty-preview i { font-size: 1.25rem; }
.empty-preview span { font-size: 0.58rem; }
.photo-copy { min-width: 0; }
.photo-copy > p { max-width: 540px; margin: 0; color: #63716b; font-size: 0.72rem; line-height: 1.55; }
.photo-hint { display: block; margin-top: 0.3rem; color: #9aa49f; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.05em; }
.photo-actions { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-top: 0.8rem; }
.photo-actions :deep(.p-button) { height: 2.45rem; border-radius: 9px; font-size: 0.68rem; }
.upload-button { border-color: #047857; background: #047857; }
.crop-editor { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem; padding: 1rem; border: 1px solid #dce5e1; border-radius: 14px; background: white; box-shadow: 0 8px 24px rgb(29 63 49 / 7%); }
.crop-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.crop-header > div > div { font-size: 0.82rem; font-weight: 750; }
.crop-header p { margin: 0.25rem 0 0; color: #85918c; font-size: 0.62rem; }
.crop-stage { overflow: hidden; border: 1px solid #dce5e1; border-radius: 14px; background: #f1f5f3; }
.cropper-host { width: 100%; height: 320px; }
.crop-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; color: #8a9690; font-size: 0.58rem; }
.crop-actions { display: flex; justify-content: flex-end; gap: 0.55rem; }
.crop-actions :deep(.p-button) { border-radius: 9px; }

@media (max-width: 520px) {
  .photo-picker { grid-template-columns: 1fr; justify-items: center; text-align: center; }
  .photo-copy > p { text-align: center; }
  .photo-actions { justify-content: center; }
  .crop-header { align-items: stretch; flex-direction: column; }
  .crop-meta { align-items: flex-start; flex-direction: column; gap: 0.25rem; }
  .crop-actions { display: grid; grid-template-columns: 1fr 1fr; }
}
</style>
