<template>
  <div class="reg-key mail-admin-page">
    <div class="mail-table-panel">
    <div class="mail-toolbar">
      <el-button type="primary" @click="openAdd">
        <template #icon><NavigationIcon name="add" :size="16" /></template>
        {{ $t('addRegKey') }}
      </el-button>
      <div class="toolbar-group">
        <el-input
            v-model="params.code"
            type="password"
            autocomplete="off"
            class="search-input"
            :placeholder="$t('searchRegKeyDesc')"
            :aria-label="$t('searchRegKeyDesc')"
            @keyup.enter="search"
        >
        </el-input>
      </div>
      <div class="toolbar-group">
        <ToolbarButton icon="search" :label="$t('search')" @click="search" />
        <ToolbarButton icon="refresh" :label="$t('refreshMail')" @click="refresh" />
        <ToolbarButton icon="clear" :label="$t('clearUnusedCodes')" @click="clearNotUse" />
      </div>
    </div>

    <el-scrollbar class="scrollbar">
      <div  class="loading" :class="regKeyLoading ? 'loading-show' : 'loading-hide'" :style="regKeyFirst ? 'background: transparent' : ''">
        <el-skeleton v-if="regKeyFirst" class="page-skeleton" :rows="6" animated />
        <loading v-else />
      </div>
      <div v-if="regKeyData.length" class="code-box">
        <div class="code-item" v-for="item in regKeyData" :key="item.regKeyId">
          <div class="code-info">
            <div class="info-left">
              <div class="info-left-item">
                <button type="button" class="code" :aria-label="$t('copy') + ' · ' + $t('regKey')"
                        :title="$t('copy')" @click="copyCode(item.code)">
                  <span aria-hidden="true">********</span>
                  <NavigationIcon name="copy" />
                </button>
              </div>
              <div class="info-left-item">
                <div>{{ $t('remainingUses') }}：</div>
                <div v-if="item.count">{{ item.count }}</div>
                <el-tag v-else type="danger">{{ $t('exhausted') }}</el-tag>
              </div>
              <div class="info-left-item">
                <div>{{ $t('roleDesc') }}：</div>
                <el-tag>{{ item.roleName }}</el-tag>
              </div>
              <div class="info-left-item">
                <div>{{ $t('validUntil') }}：</div>
                <div v-if="item.expireTime">{{ formatExpireTime(item.expireTime) }}</div>
                <el-tag v-else type="danger">{{ $t('expired') }}</el-tag>
              </div>
            </div>
            <div class="info-right">
              <el-dropdown class="setting" trigger="click" placement="bottom-end">
                <ToolbarButton icon="settings" :label="$t('action')" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="copyCode(item.code)">{{ $t('copy') }}</el-dropdown-item>
                    <el-dropdown-item @click="openHistory(item)">{{ $t('history') }}</el-dropdown-item>
                    <el-dropdown-item @click="deleteRegKey(item)">{{ $t('delete') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="!regKeyLoading && !regKeyFirst" class="empty">
        <el-empty :image-size="52">
          <template #image>
            <span class="mail-empty-icon"><NavigationIcon name="key" :size="25" /></span>
          </template>
          <template #description>
            <p class="empty-title">{{ $t('noCodeFound') }}</p>
          </template>
        </el-empty>
      </div>
    </el-scrollbar>
    </div>
    <el-dialog close-icon="MailCloseIcon" v-model="showAdd" :title="$t('addRegKey')">
      <div class="container">
        <el-input v-model="addForm.code" type="password" autocomplete="new-password"
                  :aria-label="$t('regKey')" :placeholder="$t('regKey')" @keyup.enter="submit">
          <template #suffix>
            <ToolbarButton class="gen-code" icon="refresh" :label="$t('generateRegKey')" @click.stop="genCode" />
          </template>
        </el-input>
        <el-select suffix-icon="MailChevronDown" v-model="addForm.roleId" :aria-label="$t('roleDesc')" :placeholder="$t('roleDesc')">
          <el-option v-for="item in roleList" :label="item.name" :value="item.roleId" :key="item.roleId"/>
        </el-select>
        <div class="key-limits">
          <div>
            <label for="key-expiry">{{ $t('validUntil') }}</label>
            <el-date-picker id="key-expiry" prefix-icon="MailCalendarIcon" v-model="addForm.expireTime"
                            type="date" :placeholder="$t('validUntil')" />
          </div>
          <div>
            <label for="key-count">{{ $t('remainingUses') }}</label>
            <el-input-number id="key-count" v-model="addForm.count" :min="1" :max="99999" @keyup.enter="submit" />
          </div>
        </div>
        <el-button class="btn" type="primary" @click="submit" :loading="addLoading"
        >{{ $t('add') }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog close-icon="MailCloseIcon" class="history-list" v-model="showRegKeyHistory" :title="$t('useHistory')">
      <el-skeleton v-if="historyLoading" :rows="3" animated />
      <el-table v-else class="mail-inset-table" :data="historyList" max-height="360">
        <el-table-column :min-width="emailColumnWidth" property="email" :label="$t('user')"
                         :show-overflow-tooltip="true"/>
        <el-table-column :width="createTimeColumnWidth" :formatter="formatUserCreateTime" property="createTime"
                         :label="$t('date')" fixed="right" :show-overflow-tooltip="true"/>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import ToolbarButton from '@/components/toolbar-button/index.vue'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import {defineOptions, nextTick, reactive, ref, watch} from "vue"
import loading from "@/components/loading/index.vue";
import {useSettingStore} from "@/store/setting.js";
import {roleSelectUse} from "@/request/role.js";
import {useRoleStore} from "@/store/role.js";
import {regKeyAdd, regKeyList, regKeyClearNotUse, regKeyDelete, regKeyHistory} from "@/request/reg-key.js";
import {getTextWidth} from "@/utils/text.js";
import dayjs from "dayjs";
import {tzDayjs} from "@/utils/day.js";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'reg-key'
})

const roleStore = useRoleStore();
const settingStore = useSettingStore();
const params = reactive({
  code: '',
})

const {t} = useI18n()
const roleList = reactive([])
const addLoading = ref(false)
const showAdd = ref(false)
const regKeyLoading = ref(true)
const regKeyFirst = ref(true)
const showRegKeyHistory = ref(false)
const historyList = reactive([])
const emailColumnWidth = ref(0)
const createTimeColumnWidth = ref(0)
const historyLoading = ref(false)

const addForm = reactive({
  code: '',
  count: 1,
  roleId: null,
  expireTime: null
})

const regKeyData = reactive([])

getList(true)

roleSelectUse().then(list => {
  roleList.length = 0
  roleList.push(...list)
})

watch(() => roleStore.refresh, () => {
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
})

function openHistory(regKey) {

  historyList.length = 0
  historyLoading.value = true
  regKeyHistory(regKey.regKeyId).then(list => {

    historyList.push(...list)
    if (list.length > 0) {

      const email = list.reduce((a, b) =>
          compareByLengthAndUpperCase(a, b, 'email')
      ).email;

      emailColumnWidth.value = getTextWidth(email) + 30
      emailColumnWidth.value = emailColumnWidth.value < 300 ? emailColumnWidth.value : 300
      const createTime = list.reduce((a, b) =>
          compareByLengthAndUpperCase(a, b, 'createTime')
      ).createTime;
      createTimeColumnWidth.value = getTextWidth(createTime)
    }

  }).finally(() => {
    historyLoading.value = false
  })

  showRegKeyHistory.value = true
}

const compareByLengthAndUpperCase = (a, b, key) => {
  const getUpperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length;
  if (a[key].length === b[key].length) {
    return getUpperCaseCount(a[key]) > getUpperCaseCount(b[key]) ? a : b;
  }
  return a[key].length > b[key].length ? a : b;
};

function formatUserCreateTime(regKey) {
  const createTime = tzDayjs(regKey.createTime);
  const currentYear = dayjs().year();
  const expireYear = createTime.year();

  if (settingStore.lang === 'en') {

    if (expireYear === currentYear) {
      return createTime.format('MMM D, HH:mm');
    } else {
      return createTime.format('MMM D, YYYY HH:mm');
    }

  } else {

    if (expireYear === currentYear) {
      return createTime.format('M月D日 HH:mm');
    } else {
      return createTime.format('YYYY年M月D日 HH:mm');
    }

  }

}

function toExpireUtc(expireTime) {
  return dayjs(expireTime).add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss')
}

function formatExpireTime(expireTime) {
  const expireDate = tzDayjs(expireTime).subtract(1, 'second');
  const currentYear = dayjs().year();
  const expireYear = expireDate.year();

  if (settingStore.lang === 'en') {

    return expireYear === currentYear
        ? expireDate.format('MMM D')
        : expireDate.format('MMM D, YYYY');

  } else {

    return expireYear === currentYear
        ? expireDate.format('M月D日')
        : expireDate.format('YYYY年M月D日');

  }
}

function refresh() {
  params.code = null
  getList(true)
}

function search() {
  getList(true)
}

function getList(showLoading = false) {
  if (showLoading) {
    regKeyLoading.value = true
  }
  regKeyList(params).then(list => {
    regKeyData.length = 0
    regKeyData.push(...list)
    regKeyLoading.value = false
    setTimeout(() => {
      regKeyFirst.value = false
    },200)
  })
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error('复制失败:', err);
    ElMessage({
      message: '复制失败',
      type: 'error',
      plain: true,
    })
  }
}

function genCode() {
  addForm.code = generateRandomCode()
}

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function clearNotUse() {
  ElMessageBox.confirm(t('clearRegKey'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    regKeyClearNotUse().then(() => {
      ElMessage({
        message: t('clearSuccess'),
        type: 'success',
        plain: true,
      })
      getList()
    })
  });
}

function submit() {

  if (addLoading.value) return

  if (!addForm.code) {
    ElMessage({
      message: $('emptyRegKeyMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.roleId) {
    ElMessage({
      message: t('emptyRole'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.expireTime) {
    ElMessage({
      message: t('emptyTimeMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.count) {
    ElMessage({
      message: t('emptyCountMsg'),
      type: "error",
      plain: true
    })
    return
  }

  addLoading.value = true
  regKeyAdd({...addForm, expireTime: toExpireUtc(addForm.expireTime)}).then(() => {
    showAdd.value = false
    resetForm()
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    getList()
  }).finally(() => {
    addLoading.value = false
  })
}

function deleteRegKey(regKey) {
  ElMessageBox.confirm(t('delConfirm', {msg: '********'}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    regKeyDelete([regKey.regKeyId]).then(() => {
      getList()
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}

function resetForm() {
  addForm.code = ''
}

function openAdd() {
  genCode()
  showAdd.value = true
}

</script>

<style scoped lang="scss">
.scrollbar {
  min-height: 0;
  position: relative;
  background: var(--el-bg-color);

  .code-box {
    padding: 15px 15px 25px 15px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 15px;

    .code-item {
      background: var(--el-bg-color);
      border-radius: var(--mail-radius-card);
      border: 1px solid var(--el-border-color);
      transition: all 200ms;
      padding: 15px;

      .code-info {
        display: flex;

        .info-left {
          flex: 1;
          min-width: 0;

          .info-left-item {
            display: flex;
            padding-top: 5px;

            .code {
              display: inline-flex;
              align-items: center;
              gap: 7px;
              padding: 4px 7px;
              border-radius: var(--mail-radius-control);
              background: var(--mail-shell-rail);
              color: var(--el-text-color-primary);
              font: 600 14px monospace;
              cursor: pointer;

              &:hover {
                background: var(--mail-shell-hover);
              }

              svg {
                width: 15px;
                height: 15px;
              }
            }
          }

          .info-left-item:first-child {
            padding-top: 0;
          }
        }

        .info-right {
          display: flex;
          flex-direction: column;
          padding-top: 2px;
          gap: 5px;
        }
      }
    }
  }
}

.scrollbar:has(.loading-show .page-skeleton) {
  min-height: min(180px, 30dvh);
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: min(180px, 35dvh);
}

.empty-title {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  font-weight: 500;
}

:deep(.history-list.el-dialog) {
  width: 500px !important;
}

.loading {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--loadding-background);
  z-index: 2;
}

.loading-show {
  transition: all 200ms ease 200ms;
  opacity: 1;
}

.loading-hide {
  pointer-events: none;
  transition: var(--loading-hide-transition);
  opacity: 0;
}

.container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.key-limits {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, .72fr);
  gap: 12px;
}

.key-limits label {
  display: block;
  margin-bottom: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.key-limits :is(.el-date-editor, .el-input-number) {
  width: 100%;
}

:deep(.el-dialog) {
  width: 400px !important;
}

.setting {
  cursor: pointer;
}

.gen-code {
  width: 25px;
  height: 25px;
}

.mail-toolbar .search-input {
  width: min(220px, calc(100vw - 90px));
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}

</style>
