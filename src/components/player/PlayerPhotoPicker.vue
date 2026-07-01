<script setup lang="ts">
  import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
  import Button from 'primevue/button';
  import Card from 'primevue/card';
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
  <!-- ------------------------------------------------ -->
  <!-- Photo Picker -->
  <!-- ------------------------------------------------ -->
  <div class="flex flex-col gap-[0.375rem]">
    <label class="text-sm font-medium">Foto profilo</label>

    <Card>
      <template #content>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div
            class="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-300 bg-surface-0 shadow-sm"
          >
            <img
              v-if="props.modelValue"
              :src="props.modelValue"
              alt="Anteprima foto profilo"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex flex-col items-center gap-2 text-center text-muted-color">
              <i class="pi pi-image text-2xl" />
              <span class="text-xs">Nessuna foto</span>
            </div>
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <p class="m-0 text-sm text-muted-color">
              Carica una foto del giocatore e ritagliala nel riquadro quadrato prima di salvare.
            </p>
            <div class="flex flex-wrap gap-2">
              <Button
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
        </div>
      </template>
    </Card>

    <Message v-if="errorMessage" severity="warn" :closable="false">
      {{ errorMessage }}
    </Message>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
  </div>

  <!-- ------------------------------------------------ -->
  <!-- Crop Editor -->
  <!-- ------------------------------------------------ -->
  <Card v-if="editorVisible" class="mt-4">
    <template #content>
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div class="font-semibold text-color">Ritaglia immagine</div>
            <p class="m-0 text-xs text-muted-color">
              Trascina e ridimensiona il riquadro per adattare la foto prima di confermare.
            </p>
          </div>
          <Button label="Annulla" severity="secondary" outlined size="small" @click="cancelCrop" />
        </div>

        <div class="overflow-hidden rounded-3xl border border-surface-300 bg-slate-100">
          <div ref="cropperHost" class="h-[320px] w-full" />
        </div>

        <div class="flex items-center justify-between gap-3 text-xs text-muted-color">
          <span>{{ pendingFileName }}</span>
          <span>Crop quadrato 1:1</span>
        </div>

        <div class="flex justify-end gap-2">
          <Button label="Annulla" severity="secondary" outlined @click="cancelCrop" />
          <Button label="Applica ritaglio" @click="applyCrop" />
        </div>
      </div>
    </template>
  </Card>
</template>
