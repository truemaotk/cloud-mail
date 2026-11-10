<template>
  <div class="editor-box" :class="showLoading ? 'editor-box-loading' : ''">
    <loading class="loading" v-if="showLoading"/>
    <textarea v-else style="outline: none" :id="editorId" ref="editorRef"></textarea>
  </div>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch, nextTick, shallowRef, defineEmits, computed} from 'vue';
import loading from "@/components/loading/index.vue";
import {useI18n} from 'vue-i18n'
import {useUiStore} from '@/store/ui.js'
import {useSettingStore} from '@/store/setting.js'

defineExpose({
  clearEditor,
  focus,
  getContent
})

const props = defineProps({
  defValue: {
    type: String,
    default: ''
  },
  compact: Boolean,
  contentGutter: String,
  editorId: {
    type: String,
    default: () => `editor-${Date.now()}`
  }
});


const {locale} = useI18n()
const emit = defineEmits(['change','focus']);
const editor = shallowRef(null);
const isInitialized = ref(false);
const editorRef = ref(null);
const showLoading = ref(false);
const uiStore = useUiStore();
const settingStore = useSettingStore();

onMounted(() => {
  initTinyMCE();
});

onBeforeUnmount(() => {
  destroyEditor();
});

watch(() => props.defValue, (newValue) => {
  if (editor.value && editor.value.getContent() !== newValue) {
    editor.value.setContent(newValue);
  }
});

watch(() => [uiStore.dark, settingStore.lang], () => {
  destroyEditor();
  initEditor();
});

const language = computed(() => {
  if (locale.value === 'zh') {
    return 'zh_CN'
  }

  return 'en'
})

function clearEditor() {
  if (editor.value) {
    editor.value.setContent('');
  }
}

function initTinyMCE() {
  if (window.tinymce) {
    initEditor();
  } else {
    showLoading.value = true;
    const script = document.createElement('script');
    script.src = '/tinymce/tinymce.min.js';
    script.onload = () => initEditor();
    document.head.appendChild(script);
    showLoading.value = false;
  }
}

function initEditor() {
  window.tinymce.init({
    selector: `#${props.editorId}`,
    statusbar: false,
    height: "100%",
    auto_focus: true,
    //relative_urls: false,  //阻止 img标签域名和网站域名相同 自动把链接转换相对路径
    //remove_script_host: false, // 阻止删除 URL 中的域名
    forced_root_block: 'div',
    skin: `${uiStore.dark ? 'oxide-dark' : 'oxide'}`,
    content_css: `/tinymce/css/index.css,${uiStore.dark ? 'dark' : 'default'}`,
    content_style: `:root {
         --scrollbar-track-color: ${uiStore.dark ? '#26272B' : '#FFFFFF'};
         --scrollbar-thumb-color: ${uiStore.dark ? '#6B6F78' : '#A8ABB2'};
    }
    html, body.mce-content-body {
         background: ${uiStore.dark ? '#26272B' : '#FFFFFF'};
         color: ${uiStore.dark ? '#F5F5F7' : '#1D1D1F'};
    }
    body.mce-content-body {
         font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
         font-size: 14px;
         line-height: 22px;
         margin-top: 12px !important;
    }
    body.mce-content-body a { color: ${uiStore.dark ? '#64A9FF' : '#005FC4'}; }
    body.mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: ${uiStore.dark ? '#9A9EA7' : '#6E727C'}; }
    ${props.contentGutter ? `body.mce-content-body { margin-inline: ${props.contentGutter} !important; }` : ''}`,
    plugins: 'link image advlist lists  emoticons fullscreen  table preview code',
    toolbar: 'bold emoticons forecolor backcolor italic fontsize | alignleft aligncenter alignright alignjustify | outdent indent |  bullist numlist | link image  | table code preview fullscreen',
    toolbar_location: props.compact ? 'bottom' : 'top',
    toolbar_mode: props.compact ? 'sliding' : 'scrolling',
    font_size_formats: '8px 10px 12px 14px 16px 18px 24px 36px',
    emoticons_search: false,
    language: language.value,
    language_load: true,
    menubar: false,
    license_key: 'gpl',
    noneditable_class: 'mceNonEditable',
    setup: (ed) => {
      editor.value = ed;
      ed.on('init', () => {
        ed.setContent(props.defValue);
        isInitialized.value = true;
      });
      ed.on('input change', () => {
        const content = ed.getContent();
        const text = ed.getContent({format: 'text'});
        emit('change', content, text);
      });
      ed.on('focus', () => {
        emit('focus', focus);
      })
    },
    autofocus: true,
    branding: false,
    file_picker_types: 'image',
    image_dimensions: false,
    image_description: false,
    link_title: false,
    dialog_type: 'none',
    file_picker_callback: (callback, value, meta) => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');

      input.addEventListener('change', async (e) => {
        let file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const id = 'blobid' + (new Date()).getTime();
          const blobCache = tinymce.activeEditor.editorUpload.blobCache;
          const base64 = reader.result.split(',')[1];
          const blobInfo = blobCache.create(id, file, base64);
          blobCache.add(blobInfo);

          callback(blobInfo.blobUri(), {title: file.name});
        }
        reader.readAsDataURL(file);
      });

      input.click();
    }
  });
}

function focus() {
  nextTick(() => {
    editor.value?.focus()
  })
}

function getContent() {
  return editor.value?.getContent() || ''
}


function destroyEditor() {
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
}
</script>

<style lang="scss" scoped>
.editor-box {
  height: 100%;
  width: 100%;
}

.loading {
  margin: auto;
}

.editor-box-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.tox-tbtn.tox-tbtn--select.tox-tbtn--bespoke) {
  width: 80px !important;
}

:deep(.tox.tox-tinymce.tox-fullscreen) {
  padding-right: 15px;
  padding-left: 15px;
  padding-bottom: 15px;
  background: var(--el-bg-color);
  @media (max-width: 767px) {
    padding-right: 10px;
    padding-left: 10px;
    padding-bottom: 10px;
  }
}

:deep(.tox-tinymce) {
  border: none;
  border-radius: 0;
}

:deep(.tox-toolbar__group) {
  padding-left: 0 !important;
  margin: 0 !important;
}

:deep(.tox-tbtn) {
  margin: 0 !important;
}

:deep(.tox .tox-edit-area::before) {
  display: none;
}

/* 编辑器外壳与 macOS 工具栏一致 */
:deep(.tox) {
  --tox-private-color-tint: var(--mac-accent);
  font-family: var(--mac-font);
}
:deep(.tox :is(.tox-toolbar, .tox-toolbar__primary, .tox-toolbar__overflow, .tox-editor-header, .tox-toolbar-overlord)) {
  background: var(--mac-surface) !important;
  border-color: var(--mac-line) !important;
}
:deep(.tox .tox-edit-area__iframe) { background: var(--mac-surface) !important; }
:deep(.tox .tox-tbtn) {
  height: 30px;
  border-radius: 6px;
  color: var(--mac-text-2);
}
:deep(.tox .tox-tbtn svg) { fill: var(--mac-text-2) !important; }
:deep(.tox .tox-tbtn:hover), :deep(.tox .tox-tbtn--enabled), :deep(.tox .tox-tbtn--enabled:hover) {
  background: var(--mac-hover) !important;
  color: var(--mac-text);
}
:deep(.tox .tox-tbtn--enabled svg), :deep(.tox .tox-tbtn:hover svg) { fill: var(--mac-text) !important; }
:deep(.tox .tox-tbtn__select-label) { color: var(--mac-text-2); font-size: 13px; }
:deep(.tox .tox-split-button:hover) { box-shadow: 0 0 0 1px var(--mac-line) inset; border-radius: 6px; }

</style>
