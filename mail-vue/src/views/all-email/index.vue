<template>
  <div class="email-list-box">
    <emailScroll ref="sysEmailScroll"
                 :get-emailList="getEmailList"
                 :email-delete="allEmailDelete"
                 :star-add="starAdd"
                 :star-cancel="starCancel"
                 :show-star="false"
                 show-user-info
                 show-status
                 :show-account-icon="false"
                 :time-sort="params.timeSort"
                 @jump="jumpContent"
                 @right-search="rightSearch"
                 :highlight-text="appliedSearchText"
                 :type="'all-email'"

    >
      <template #first>
        <form class="all-mail-filters" @submit.prevent="search">
          <el-select suffix-icon="MailChevronDown" v-model="params.searchType" :aria-label="$t('searchType')" class="search-field">
            <el-option :label="$t('sender')" value="name" />
            <el-option :label="$t('subject')" value="subject" />
            <el-option :label="$t('user')" value="user" />
            <el-option :label="$t('selectEmail')" value="account" />
          </el-select>
          <el-input v-model="searchValue" class="search-input"
                    :aria-label="$t('searchByContent')" :placeholder="$t('searchByContent')"
                    clearable @clear="search">
            <template #prefix>
              <NavigationIcon name="search" :size="16" />
            </template>
          </el-input>
          <el-button type="primary" native-type="submit" class="search-submit">{{ $t('search') }}</el-button>
          <el-select suffix-icon="MailChevronDown" v-model="params.type" :aria-label="$t('tabStatus')" class="status-select" @change="typeSelectChange">
            <el-option :label="$t('all')" value="all" />
            <el-option :label="$t('received')" value="receive" />
            <el-option :label="$t('sent')" value="send" />
            <el-option :label="$t('selectDeleted')" value="delete" />
            <el-option :label="$t('noRecipientTitle')" value="noone" />
          </el-select>
        </form>
      </template>
      <template #actions>
        <ToolbarButton
          :icon="params.timeSort === 0 ? 'sort-new' : 'sort-old'"
          :label="$t(params.timeSort === 0 ? 'sortNewest' : 'sortOldest')"
          @click="changeTimeSort"
        />
        <ToolbarButton icon="clear" :label="$t('clearEmail')" @click="openBatchDelete" />
      </template>
    </emailScroll>
    <el-dialog close-icon="MailCloseIcon" v-model="showBathDelete" :title="$t('clearEmail')" width="335"
               @closed="closedClear">
      <div class="clear-email">
        <el-input v-model="clearParams.sendName" :placeholder="$t('sender')" @keyup.enter="batchDelete"/>
        <el-input v-model="clearParams.subject" :placeholder="$t('subject')" @keyup.enter="batchDelete"/>
        <el-input v-model="clearParams.sendEmail" :placeholder="$t('sendEmailAddress')" @keyup.enter="batchDelete"/>
        <el-input v-model="clearParams.toEmail" :placeholder="$t('toEmail')" @keyup.enter="batchDelete"/>
        <el-date-picker prefix-icon="MailCalendarIcon" popper-class="my-date-picker"
                        v-model="clearTime"
                        type="daterange"
                        :teleported="false"
                        unlink-panels
                        :range-separator="t('to')"
                        size="default"
        />
        <div class="clear-button">
          <el-select suffix-icon="MailChevronDown" v-model="clearParams.type" style="width: 200px">
            <el-option key="eq" :label="t('equal')" value="eq"/>
            <el-option key="left" :label="t('leading')" value="left"/>
            <el-option key="include" :label="t('include')" value="include"/>
          </el-select>
          <el-button :loading="clearLoading" type="primary" @click="batchDelete">{{ t('clear') }}</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {starAdd, starCancel} from "@/request/star.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {computed, defineOptions, reactive, ref, watch, onMounted} from "vue";
import {useEmailStore} from "@/store/email.js";
import {
  allEmailList,
  allEmailDelete,
  allEmailBatchDelete,
  allEmailLatest
} from "@/request/all-email.js";
import ToolbarButton from '@/components/toolbar-button/index.vue'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import router from "@/router/index.js";
import {useI18n} from 'vue-i18n';
import {toUtc} from "@/utils/day.js";
import {sleep} from "@/utils/time-utils.js";
import {useSettingStore} from "@/store/setting.js";
import { useRoute } from 'vue-router'

defineOptions({
  name: 'all-email'
})

const route = useRoute()
const {t} = useI18n();
const emailStore = useEmailStore();
const settingStore = useSettingStore();
const clearTime = ref('')
const sysEmailScroll = ref({})
const searchValue = ref('')
const showBathDelete = ref(false)
const clearLoading = ref(false)

onMounted(() => {
  latest();
})

const params = reactive({
  timeSort: 0,
  type: 'receive',
  userEmail: null,
  accountEmail: null,
  name: null,
  subject: null,
  searchType: 'name'
})

const clearParams = reactive({
  subject: '',
  sendEmail: '',
  sendName: '',
  startTime: '',
  toEmail: '',
  endTime: '',
  type: 'eq',
})

function resetClearParams() {
  clearParams.subject = ''
  clearParams.sendEmail = ''
  clearParams.sendName = ''
  clearParams.startTime = ''
  clearParams.toEmail = ''
  clearParams.endTime = ''
}

function closedClear() {
  resetClearParams()
  clearParams.type = 'eq'
  clearParams.endTime = ''
  clearTime.value = null
}

const appliedSearchText = computed(() => params.name || params.subject || params.userEmail || params.accountEmail || '')

const paramsStar = localStorage.getItem('all-email-params')
if (paramsStar) {
  const locaParams = JSON.parse(paramsStar)
  params.type = locaParams.type
  params.timeSort = locaParams.timeSort
  params.status = locaParams.status
  params.searchType = locaParams.searchType ?? params.searchType
}

watch(() => params, () => {
  localStorage.setItem('all-email-params', JSON.stringify(params))
}, {
  deep: true
})

function openBatchDelete() {
  showBathDelete.value = true
}

function batchDelete() {

  if (clearLoading.value) return

  if (clearTime.value) {
    clearParams.startTime = toUtc(clearTime.value[0]).format("YYYY-MM-DD HH:mm:ss")
    clearParams.endTime = toUtc(clearTime.value[1]).add(1, 'day').format("YYYY-MM-DD HH:mm:ss")
  }

  if (!clearParams.sendEmail && !clearParams.sendName && !clearParams.subject && !clearParams.toEmail && !clearTime.value) {
    showBathDelete.value = false
    return
  }

  ElMessageBox.confirm(
      t('delAllConfirm'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      }
  ).then(() => {
    clearLoading.value = true

    allEmailBatchDelete(clearParams).then(() => {
      emailStore.refreshUnreadCounts()
      ElMessage({
        message: t('clearSuccess'),
        type: "success",
        plain: true
      })
      resetClearParams()
      sysEmailScroll.value.refreshList();
    }).finally(() => {
      clearLoading.value = false
    })
  })
}

function rightSearch(type, value) {
  params.searchType = type;
  searchValue.value = value;
  search();
}

function search() {

  params.userEmail = null
  params.accountEmail = null
  params.name = null
  params.subject = null

  if (params.searchType === 'user') {
    params.userEmail = searchValue.value
  }

  if (params.searchType === 'account') {
    params.accountEmail = searchValue.value
  }

  if (params.searchType === 'name') {
    params.name = searchValue.value
  }

  if (params.searchType === 'subject') {
    params.subject = searchValue.value
  }

  sysEmailScroll.value.refreshList();
}

function changeTimeSort() {
  params.timeSort = params.timeSort ? 0 : 1
  search()
}

function typeSelectChange() {
  search()
}

function jumpContent(email) {
  emailStore.openMessage(email, 'all-mail')
  router.push({name: 'content', params: {mailbox: 'all-mail'}})
}


function getEmailList(emailId, size) {
  return emailStore.fetchList(full => allEmailList({emailId, size, full, ...params}))
}

async function latest() {

  while (true) {

    let autoRefresh = settingStore.settings.autoRefresh;

    await sleep(autoRefresh > 1 ? autoRefresh * 1000 : 3000);

    const latestId = sysEmailScroll.value.latestEmail?.emailId

    if (autoRefresh < 2) {
      continue
    }

    if (!latestId && latestId !== 0) {
      continue
    }

    if (route.name !== 'all-email') {
      continue
    }


    if (params.type !== 'receive') {
      continue
    }

    try {

      const curTimeSort = params.timeSort
      let list = await allEmailLatest(latestId)

      if (list.length === 0) {
        continue
      }

      if (params.type !== 'receive') {
        continue
      }

      // 确保回来之后条件没变
      if (params.timeSort !== curTimeSort) {
        continue
      }

      emailStore.applyFullList(list)

      for (let email of list) {

        sysEmailScroll.value.addItem(email)
        await sleep(50)

      }

    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        settingStore.settings.autoRefresh = 0;
      }
      console.error(e)
    }

  }
}

</script>
<style>

@media (max-width: 767px) {
  .el-date-range-picker .el-picker-panel__body {
    min-width: auto;

  }

  .my-date-picker::after {
    content: "";
    position: absolute; /* 脱离文档流，不会撑开 */
    left: 0;
    right: 0;
    height: 20px;
    background: transparent; /* 方便看效果 */
  }

  .el-date-range-picker__content {
    width: 100%;
  }

  .el-date-range-picker {
    width: 300px;
  }

  .el-tooltip .el-picker_popper {
    padding-bottom: 200px;
  }

  .el-date-range-picker__content.is-left {
    border-right: 0;
  }
}

</style>
<style scoped lang="scss">
.email-list-box {
  height: 100%;
  width: 100%;
  overflow: hidden;
}


.all-mail-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.search-field {
  width: 110px;
}

.search-input {
  flex: 1 1 180px;
  min-width: 130px;
  max-width: 320px;
}

.search-submit {
  margin: 0;
}

.status-select {
  width: 112px;
}

@media (max-width: 480px) {
  .search-field {
    width: 92px;
  }

  .search-input {
    min-width: 105px;
    flex-basis: 105px;
  }
}

.clear-email {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.clear-button {
  display: flex;
  align-items: center;
  gap: 15px;

  .el-button {
    width: 100%;
  }
}

:deep(.el-date-editor.el-input__wrapper) {
  width: 303px;
}
</style>
