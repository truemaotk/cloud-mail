<template>
  <div class="email-container" :class="{ 'mail-register': isMailRegister, 'register-compact': isCompactRegister }">
    <div class="header-actions">
      <div class="header-select">
        <el-checkbox
            class="selection-control"
            v-model="checkAll"
            :aria-label="$t('selectAllMail')"
            :indeterminate="isIndeterminate"
            :disabled="!emailList.length || loading"
            @change="handleCheckAllChange"
        />
        <template v-if="isMailRegister">
          <span class="register-sender-label">{{ $t('sender') }}</span>
          <span class="register-message-label">{{ $t('mailListMessage') }}</span>
          <span class="register-mailbox-label">{{ $t('mailListMailbox') }}</span>
          <span class="register-time-label">{{ $t('date') }}</span>
        </template>
      </div>
      <div class="header-left">
        <slot name="first"></slot>
        <div class="toolbar-group">
          <slot name="actions"></slot>
          <ToolbarButton icon="refresh" :label="$t('refreshMail')" :busy="loading" @click="refresh" />
          <ToolbarButton v-if="checkedEmailCount > 0" v-perm="'email:delete'"
                         icon="delete" :label="$t('delete')" @click="handleDelete" />
          <ToolbarButton v-if="checkedEmailCount > 0 && showUnread" v-perm="'email:delete'"
                         icon="mark-read" :label="$t('markAsRead')" @click="handleRead" />
        </div>
      </div>

      <div class="header-right">
        <span v-if="isMailRegister" class="email-count" aria-live="polite">
          {{ checkedEmailCount ? $t('mailListSelected', { total: checkedEmailCount }) : $t('emailCount', { total }) }}
        </span>
        <span class="email-count" v-else-if="total">{{ $t('emailCount', {total: total}) }}</span>
        <ToolbarButton
          v-if="showAccountIcon && settingStore.settings.manyEmail === 0"
          v-perm="'account:query'"
          icon="panel-left"
          :label="$t('toggleMailboxes')"
          :aria-expanded="accountShow"
          aria-controls="mailbox-rail"
          @click="changeAccountShow"
        />
      </div>
    </div>

    <div ref="scroll" class="scroll">
      <UseVirtualList ref="scrollbarRef"
                        @scroll="onScroll"
                        :list="list"
                        :options="{ itemHeight: itemHeight, overscan: 15 }"
                        class="virtual"
                        style="height: 100%"
                        v-if="!loading && emailList.length > 0"
                        :key="keyCount"
        >
          <template #default="{ data: item, index }" >
            <div :class="['email-row', props.type, { 'right-checked': item.rightChecked }]"
                 :data-checked="item.checked"
                 @click="jumpDetails(item, $event)"
                 v-if="!item.expand"
                 :key="item.emailId"
                 @contextmenu="handleContextmenu($event, item)"
            >
              <el-checkbox class="selection-control row-select"
                           v-model="item.checked"
                           :aria-label="$t('selectMail', { subject: item.subject })"
                           :disabled="!item.checked && isSelectMax"
                           @click.stop></el-checkbox>
              <ToolbarButton
                v-if="showStar"
                class="row-star"
                :icon="item.isStar ? 'star-fill' : 'star'"
                :label="$t('star')"
                :aria-pressed="!!item.isStar"
                :disabled="!allowStar && !item.isStar"
                @click.stop="starChange(item)"
              />
              <div class="title">

                <div class="email-sender" :style="(item.unread === EmailUnreadEnum.UNREAD && showUnread) ? 'font-weight: bold' : ''">
                  <div class="email-status" v-if="showStatus && (item.statusIcon || (item.isDel && item.status !== 6))">
                    <el-tooltip :show-after="0" :hide-after="0" v-if="item.statusIcon" effect="dark" :content="item.statusIcon.content">
                      <NavigationIcon :name="item.statusIcon.icon" :style="{ color: item.statusIcon.color }" :size="17" />
                    </el-tooltip>
                    <div class="del-status" v-if="item.isDel && item.status !== 6">
                      <el-tooltip :show-after="0" :hide-after="0" effect="dark" :content="item.isDelContent">
                        <NavigationIcon name="mail-deleted" class="icon" :size="20" />
                      </el-tooltip>
                    </div>
                  </div>
                  <span class="name">
                    <span>
                      <div class="unread" v-if="isMobile && (item.unread === EmailUnreadEnum.UNREAD && showUnread) "/>
                      <slot name="name" :email="item"><span v-html="item.nameHtml"></span></slot>
                    </span>
                    <span>
                      <NavigationIcon name="star-fill" v-if="item.isStar" />
                    </span>
                  </span>
                  <span class="phone-time">{{ item.formatCreateTime }}</span>
                </div>
                <div class="message-info">
                  <div class="email-text">
                    <span class="email-subject" :style="(item.unread === EmailUnreadEnum.UNREAD && showUnread)  ? 'font-weight: bold' : ''">
                      <div class="unread" v-if="!isMobile && (item.unread === EmailUnreadEnum.UNREAD && showUnread) "/>
                      <span v-if="item.code" class="code-tag" @click.stop="copyCode(item.code)">[{{ t('codeLabel') }}{{ item.code }}]</span>
                      <button type="button" class="subject-text" @click.stop="jumpDetails(item, $event)">
                        <slot name="subject" :email="item" >
                          <span v-if="item.subject" v-html="item.subjectHtml"></span>
                          <span v-else>{{ $t('noSubject') }}</span>
                        </slot>
                      </button>
                    </span>
                    <span class="email-content" v-html="item.listHtml"></span>
                  </div>
                </div>
              </div>
              <div class="user-info" v-if="showUserInfo">
                <div class="account" v-if="item.accountEmailHtml" :title="`${$t('selectEmail')} · ${item.mailboxEmail}`">
                  <NavigationIcon name="mail" :size="14" />
                  <span v-html="item.accountEmailHtml"></span>
                </div>
                <div class="user" v-if="item.showOwnerEmail" :title="`${$t('user')} · ${item.userEmail}`">
                  <NavigationIcon name="user" :size="14" />
                  <span v-html="item.userEmailHtml"></span>
                </div>
                <span v-if="!item.accountEmailHtml && !item.showOwnerEmail">—</span>
              </div>
              <div class="email-right">
                <span class="email-time" :style="(item.unread === EmailUnreadEnum.UNREAD && showUnread) ? 'font-weight: bold' : ''">{{ item.formatCreateTime }}</span>
              </div>
            </div>
            <skeletonBlock v-else-if="item.expand === 'loading'"
                           :rows="1"
                           :showStar="showStar"
                           :showStatus="showStatus"
                           :showUserInfo="showUserInfo"
                           :type="type"/>
            <div class="noLoading" v-else-if="item.expand === 'noMoreData'">
              <div>{{ $t('noMoreData') }}</div>
            </div>
          </template>
        </UseVirtualList>
      <skeletonBlock v-if="firstLoad && showFirstLoading"
                       :rows="20"
                       :showStar="showStar"
                       :showStatus="showStatus"
                       :showUserInfo="showUserInfo"
                       :type="type"/>
      <skeletonBlock v-if="loading"
                       :rows="skeletonRows"
                       :showStar="showStar"
                       :showStatus="showStatus"
                       :showUserInfo="showUserInfo"
                       :type="type"/>
      <div class="empty" v-if="noLoading && emailList.length === 0 && !loading">
        <slot name="empty">
          <el-empty :image-size="52" :description="$t('noMessagesFound')">
            <template #image>
              <span class="mail-empty-icon"><NavigationIcon name="inbox" :size="25" /></span>
            </template>
          </el-empty>
        </slot>
      </div>
    </div>
    <el-dropdown
        ref="dropdownRef"
        @visible-change="visibleChange"
        :virtual-ref="triggerRef"
        :show-arrow="false"
        :popper-options="{
      modifiers: [{ name: 'offset', options: { offset: [0, 0] } }],
    }"
        virtual-triggering
        trigger="contextmenu"
        placement="bottom-start"
    >
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="rightClickEmail.code" @click="copyCode(rightClickEmail.code)" >
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="clipboard" :size="20" />
                <span>{{t('copyCode')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email'].includes(props.type)" @click="emailRead(rightClickEmail.emailId)" >
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="mark-read" :size="20" />
                <span>{{t('markAsRead')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','star'].includes(props.type)" @click="openReply(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="reply" :size="19" />
                <span>{{t('reply')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','send', 'star'].includes(props.type)" @click="openForward(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="forward" :size="19" />
                <span>{{t('forward')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','send', 'star'].includes(props.type)" @click="starChange(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="star" :size="19" />
                <span>{{t('star')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email'" @click="handleSearch('user', rightClickEmail.userEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="search" :size="20" />
                <span>{{t('searchUser')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email' " @click="handleSearch('account', rightClickEmail.toEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="search" :size="20" />
                <span>{{t('searchEmail')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email' " @click="handleSearch('name', rightClickEmail.name)">
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="search" :size="20" />
                <span>{{t('searchSender')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="rightDelete(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item">
                <NavigationIcon name="delete" :size="16" />
                <span>{{t('delete')}}</span>
              </div>
            </template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'
import ToolbarButton from '@/components/toolbar-button/index.vue'
import skeletonBlock from "@/components/email-scroll/skeleton/index.vue"
import {computed, onActivated, reactive, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {fromNow} from "@/utils/day.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
import { UseVirtualList } from '@vueuse/components'
import { useElementSize, useMediaQuery, useScroll } from '@vueuse/core'

const props = defineProps({
  getEmailList: Function,
  emailDelete: Function,
  emailRead: Function,
  starAdd: Function,
  starCancel: Function,
  cancelSuccess: Function,
  starSuccess: Function,
  timeSort: {
    type: Number,
    default: 0,
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  showAccountIcon: {
    type: Boolean,
    default: true,
  },
  showUserInfo: {
    type: Boolean,
    default: false
  },
  showStar: {
    type: Boolean,
    default: true
  },
  allowStar: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'email'
  },
  showFirstLoading: {
    type: Boolean,
    default: true
  },
  showUnread: {
    type: Boolean,
    default: false
  },
  highlightText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['jump', 'refresh-before', 'delete-draft', 'right-search'])

const {t} = useI18n()
const settingStore = useSettingStore()
const uiStore = useUiStore();
const emailStore = useEmailStore();
const loading = ref(false);
const followLoading = ref(false);
const noLoading = ref(false);
const emailList = reactive([])
const total = ref(0);
const checkAll = ref(false);
const isIndeterminate = ref(false);
const scroll = ref(null)
const firstLoad = ref(true)
let scrollTop = 0
const latestEmail = ref(null)
const scrollbarRef = ref(null)
// iPad can report a Mac platform when requesting desktop websites.
const isMacOS = /Mac/.test(navigator.platform) && navigator.maxTouchPoints <= 1
let requestVersion = 0
let requesting = false
const isMobile = useMediaQuery('(max-width: 1366px)')
const isMailRegister = computed(() => props.type === 'all-email')
const { width: registerWidth } = useElementSize(computed(() => isMailRegister.value ? scroll.value : null))
const isCompactRegister = computed(() => registerWidth.value > 0 && registerWidth.value < 760)
let skeletonRows = 0
const timePaddingRight = ref('');
const keyCount = ref(0);
const dropdownRef = ref(null);
const dropdownCloseLock = ref(false);
const dropdownShow = ref(false);
const rightClickEmail = ref({});
const MAX_SELECT_COUNT = 95;
const checkedEmailCount = ref(0);
const isSelectMax = computed(() => checkedEmailCount.value >= MAX_SELECT_COUNT);
let timer = null
const position = ref(
    DOMRect.fromRect({
      x: 0,
      y: 0,
    })
)

const triggerRef = ref({
  getBoundingClientRect() {
    return position.value;
  }
})

const queryParam = reactive({
  size: 50
});

defineExpose({
  refreshList,
  deleteEmail,
  addItem,
  handleList,
  emailList,
  firstLoad,
  latestEmail,
  noLoading,
  total
})

onActivated(() => {
  requestAnimationFrame(() => {
    const index = scrollTop / itemHeight.value
    scrollbarRef.value?.scrollTo(index);
  })
})

onMounted(() => {
  timer = setInterval(() => {
    emailList.forEach(email => {
      email.formatCreateTime = fromNow(email.createTime);
    })
  }, 1000 * 60);
})

onUnmounted(() => {
  clearInterval(timer)
})

getEmailList()

function onScroll(e) {
  scrollTop = e.target.scrollTop;
}

const { arrivedState } = useScroll(scrollbarRef, {
  offset: { bottom: isMobile.value ? 2200 : 1500 }
})


const list = computed(() => {
  if (followLoading.value) return [...emailList, { emailId: 0, expand: 'loading' }]
  if (noLoading.value && emailList.length >= queryParam.size) {
    return [...emailList, { emailId: 0, expand: 'noMoreData' }]
  }
  return [...emailList]
})

const itemHeight = computed(() => {
  if (isMailRegister.value) {
    return isCompactRegister.value ? 104 : 72
  }
  return isMobile.value ? 83 : 48
})

watch(emailList, () => {
  updateHasScrollbar();
})

watch(scrollbarRef, () => {
  updateHasScrollbar();
})

// 强制刷新 (itemHeight 更改后虚拟滚动列表不会自己更新)
watch(itemHeight, () => {
  keyCount.value ++
})


// 监听是否到达底部
watch(() => arrivedState.bottom, (isBottom) => {
  if (isBottom && !loading.value) {
    loadData();
  }
});

watch(() => emailList.map(item => item.checked), updateCheckStatus)


watch(() => emailStore.deleteIds, () => {
  if (emailStore.deleteIds) {
    deleteEmail(emailStore.deleteIds)
  }
})

watch(() => emailStore.cancelStarEmailId, () => {
  emailList.forEach(email => {
    if (email.emailId === emailStore.cancelStarEmailId) {
      email.isStar = 0
    }
  })
})

watch(() => emailStore.addStarEmailId, () => {
  emailList.forEach(email => {
    if (email.emailId === emailStore.addStarEmailId) {
      email.isStar = 1
    }
  })
})

window.addEventListener('wheel', (event) => {
  if (dropdownShow.value) {
    dropdownRef.value.handleClose();
  }
})

function openReply(email) {
  const fullEmail = emailStore.detailMap[email.emailId]
  if (!fullEmail) return
  uiStore.writerRef.openReply(fullEmail)
}

function openForward(email) {
  const fullEmail = emailStore.detailMap[email.emailId]
  if (!fullEmail) return
  uiStore.writerRef.openForward(fullEmail)
}

function visibleChange(e) {
  dropdownShow.value = e;
  dropdownCloseLock.value = true;
  setTimeout(() => {
    dropdownCloseLock.value = false;
  },1500)

  if (!e && rightClickEmail.value.rightChecked) {
    rightClickEmail.value.rightChecked = false
  }
}

const handleContextmenu = (event, email) => {

  if (props.type === 'draft') {
    return
  }

  if (rightClickEmail.value.rightChecked) {
    rightClickEmail.value.rightChecked = false
  }

  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({
    x: clientX,
    y: clientY,
  })
  event.preventDefault();
  dropdownRef.value?.handleOpen();

  rightClickEmail.value = email;
  rightClickEmail.value.rightChecked = true
}

function updateHasScrollbar() {
  nextTick(() => {

    if (isMacOS) {
      timePaddingRight.value = '15px'
      return
    }

    const doc = document.querySelector('.virtual');
    if (doc) {
      if (doc.scrollHeight > doc.clientHeight) {
        timePaddingRight.value = '6px';
      } else {
        timePaddingRight.value = '15px'
      }
    }
  })
}

function getSkeletonRows() {
  if (emailList.length > 20) return skeletonRows = 20
  if (emailList.length === 0) return skeletonRows = 1
  skeletonRows = emailList.length
}

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

function starChange(email) {

  if (!email.isStar) {

    if (!props.allowStar) return;

    email.isStar = 1;
    props.starAdd(email.emailId).then(() => {
      email.isStar = 1;
      props.starSuccess(email)
    }).catch(e => {
      console.error(e)
      email.isStar = 0
    })
  } else {

    email.isStar = 0;
    props.starCancel(email.emailId).then(() => {
      email.isStar = 0;
      props.cancelSuccess?.(email)
    }).catch(e => {
      console.error(e)
      email.isStar = 1;
    })
  }
}

function changeAccountShow() {
  uiStore.accountShow = !uiStore.accountShow;
}

const handleRead = () => {
  markRead(getSelectedMailsIds())
}

function emailRead(emailId) {
  markRead([emailId])
}

function markRead(emailIds) {
  props.emailRead(emailIds).then(() => {
    localRead(emailIds)
    emailStore.refreshUnreadCounts()
  }).catch(() => {
    // The request layer displays the error.
  })
}

function localRead(emailIds) {
  emailIds.forEach(emailId => {
    const index = emailList.findIndex(email => email.emailId === emailId);
    if (index > -1) {
      emailList[index].unread = EmailUnreadEnum.READ;
      emailList[index].checked = false;
    }
  })
}

function rightDelete(emailId) {

  if (props.type === 'all-email') {
    ElMessageBox.confirm(t('delOneEmailConfirm'), {
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
      type: 'warning'
    }).then(() => {
      props.emailDelete([emailId]).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true
        })
        emailStore.deleteIds = [emailId];
      })
    })
    return;
  }
  props.emailDelete([emailId]).then(() => {
    ElMessage({
      message: t('delSuccessMsg'),
      type: 'success',
      plain: true
    })
    emailStore.deleteIds = [emailId];
  })
}

function handleSearch(type, value) {
  emit('right-search', type, value);
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true
    })
  }
}

function handleDelete() {
  ElMessageBox.confirm(t('delEmailsConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {

    if (props.type === 'draft') {
      const draftIds = getSelectedDraftsIds();
      emit('delete-draft', draftIds);
      return;
    }

    const emailIds = getSelectedMailsIds();
    props.emailDelete(emailIds).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true
      })
      emailStore.deleteIds = emailIds;
    })
  })
}

function deleteEmail(emailIds) {
  emailIds.forEach(emailId => {
    emailList.forEach((item, index) => {
      if (emailId === item.emailId) {
        emailList.splice(index, 1);
      }
    })
  })
  if (emailList.length < queryParam.size && !noLoading.value) {
    getEmailList()
  }
}

function addItem(email) {

  const existIndex = emailList.findIndex(item => item.emailId === email.emailId)

  if (existIndex > -1) {
    return false;
  }

  email.formatCreateTime = fromNow(email.formatCreateTime);

  if (props.timeSort) {
    if (noLoading.value) {
      handleList([email]);
      emailList.push(email);
    }

    if (email.emailId > latestEmail.value?.emailId) {
      latestEmail.value = email
    }

    total.value++
    return true;
  }


  const index = emailList.findIndex(item => item.emailId < email.emailId)

  if (index !== -1) {
    handleList([email]);
    emailList.splice(index, 0, email);
  } else {
    if (noLoading.value) {
      handleList([email]);
      emailList.push(email);
    }
  }

  if (email.emailId > latestEmail.value?.emailId) {
    latestEmail.value = email
  }

  total.value++
  return true;
}

function handleCheckAllChange(val) {
  if (val) {
    let count = 0;
    emailList.forEach(item => {
      if (count < MAX_SELECT_COUNT) {
        item.checked = true;
        count++;
      } else {
        item.checked = false;
      }
    });
  } else {
    emailList.forEach(item => item.checked = false);
  }
  isIndeterminate.value = false;
}

// 获取选中的邮件列表id
function getSelectedMailsIds() {
  return emailList.filter(item => item.checked).map(item => item.emailId);
}

function getSelectedDraftsIds() {
  return emailList.filter(item => item.checked).map(item => item.draftId);
}

function updateCheckStatus() {
  const checkedCount = emailList.filter(item => item.checked).length;
  checkedEmailCount.value = checkedCount;
  const atMax = checkedCount >= MAX_SELECT_COUNT;
  checkAll.value = emailList.length > 0 && (checkedCount === emailList.length || atMax);
  isIndeterminate.value = checkedCount > 0 && !checkAll.value;
}

function jumpDetails(email, event) {

  if (dropdownShow.value) {
    dropdownRef.value.handleClose();
    return;
  }

  if (!dropdownCloseLock.value && event.detail > 0) {
    const sel = window.getSelection();
    if (sel?.toString().trim() && event.currentTarget.closest('.email-row')?.contains(sel.anchorNode)) {
      return
    }
  }
  emit('jump', email)
}


async function getEmailList(refresh = false) {
  if (!refresh && (requesting || loading.value || noLoading.value)) return

  const version = ++requestVersion
  const emailId = refresh ? 0 : (emailList.at(-1)?.emailId ?? 0)
  requesting = true
  if (refresh) {
    getSkeletonRows()
    scrollTop = 0
    emailList.length = 0
    latestEmail.value = null
    total.value = 0
    noLoading.value = false
  }

  loading.value = refresh || emailList.length === 0
  followLoading.value = !loading.value
  try {
    const data = await props.getEmailList(emailId, queryParam.size)
    // A refresh can supersede a slower mailbox, search, or pagination request.
    if (version !== requestVersion) return
    firstLoad.value = false

    const list = data.list.map(item => ({
      ...item,
      checked: false
    }));


    latestEmail.value = data.latestEmail

    handleList(list);
    emailList.push(...list);
    if (refresh) scrollbarRef.value?.setScrollTop(0);

    noLoading.value = data.list.length < queryParam.size;
    followLoading.value = data.list.length >= queryParam.size;

    total.value = data.total;
  } catch {
    // The request layer already reports failures.
    if (version === requestVersion) {
      firstLoad.value = false
      followLoading.value = false
    }
  } finally {
    if (version === requestVersion) {
      loading.value = false
      requesting = false
    }
  }
}

function handleList(list) {
  list.forEach(email => {
    email.formatCreateTime = fromNow(email.createTime);
    email.test = t('received')
    const statusIconMap = {
      0: { icon: 'mail-received', color: '#51C76B', content: t('received') },
      1: { icon: 'send',  color: '#51C76B', content: t('sent') },
      2: { icon: 'mail-delivered',     color: '#51C76B', content: t('delivered') },
      3: { icon: 'mail-error',         color: '#F56C6C', content: t('bounced') },
      8: { icon: 'mail-error',         color: '#F56C6C', content: t('bounced') },
      4: { icon: 'mail-alert', color: '#FBBD08', content: t('complained') },
      5: { icon: 'mail-delay',  color: '#FBBD08', content: t('delayed') },
      6: { icon: 'mail-saving', color: '#909399', content: t('saving') },
      7: { icon: 'mail-alert', color: '#FBBD08', content: t('noRecipient') },
    };

    if (email.isDel) {
      email.isDelContent = t('selectDeleted');
    }
    email.statusIcon = statusIconMap[email.status];
    applyHighlight(email);
  })
}

function applyHighlight(email) {
  email.nameHtml = renderHighlight(email.name);
  email.subjectHtml = renderHighlight(email.subject);
  email.listHtml = renderHighlight(email.listText || email.text);
  if (props.showUserInfo) {
    const ownerEmail = (email.userEmail || '').trim()
    email.mailboxEmail = ((email.type === 0 ? email.toEmail : email.sendEmail) || '').trim()
    email.showOwnerEmail = Boolean(ownerEmail && ownerEmail.toLowerCase() !== email.mailboxEmail.toLowerCase())
    email.userEmailHtml = renderHighlight(ownerEmail)
    email.accountEmailHtml = email.mailboxEmail ? renderHighlight(email.mailboxEmail) : ''
  }
}

watch(() => props.highlightText, () => {
  emailList.forEach(applyHighlight);
})

function refresh() {
  if (loading.value) return
  emit('refresh-before')
  if (props.skeleton) {
    scrollbarRef.value?.setScrollTop(0)
  }
  refreshList()
}

function refreshList() {
  checkAll.value = false;
  isIndeterminate.value = false;
  getEmailList(true);
}

function loadData() {
  getEmailList()
}


function escapeHtml(value) {
  return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
}

function renderHighlight(value) {
  const text = value == null ? '' : String(value)
  if (!text) return '\u200B'
  const keyword = props.highlightText?.trim()
  if (!keyword) return escapeHtml(text)
  const pattern = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  let html = ''
  let lastIndex = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    html += escapeHtml(text.slice(lastIndex, index))
    html += `<mark class="search-hit">${escapeHtml(match[0])}</mark>`
    lastIndex = index + match[0].length
  }
  html += escapeHtml(text.slice(lastIndex))
  return html
}

</script>
<style lang="scss" scoped>
:deep(.search-hit) {
  background-color: var(--search-hit-background);
  color: inherit;
  padding: 0;
  border-radius: 2px;
}


.email-container {
  --mail-list-control-gap: 4px;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  height: 100%;
}

.scroll {
  margin: 0;
  height: 100%;
  overflow: hidden;

  .virtual {
    will-change: scroll-position;
  }

  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .noLoading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px 0 0 0;
    color: var(--secondary-text-color);
  }

  .follow-loading {
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--loadding-background);
    height: 100%;
    width: 100%;
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
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
}

:deep(.email-row) {
  display: flex;
  padding: 8px 0;
  justify-content: space-between;
  box-shadow: var(--header-actions-border);
  cursor: pointer;
  align-items: center;
  position: relative;
  transition: background 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  height: 48px;
  @media (max-width: 1366px) {
    height: 83px;
  }

  @media (pointer: coarse) {
    /* 触屏 */
    user-select: none;
  }
  .row-select.el-checkbox {
    flex: 0 0 var(--mail-shell-control);
    margin-inline: var(--mail-shell-gutter) var(--mail-list-control-gap);
  }

  .row-star {
    display: grid;
    flex: 0 0 var(--mail-shell-control);
    height: var(--mail-shell-control);
    place-items: center;
    margin-inline-end: 8px;
    border-radius: 5px;
    color: var(--el-text-color-primary);

  }

  .title {
    flex: 1;
    display: grid;
    min-width: 0;
    grid-template-columns: 240px minmax(0, 1fr);

    @media (max-width: 1366px) {
      padding-right: 15px;
      grid-template-columns: minmax(0, 1fr);
      gap: 4px;
    }

    .email-sender {
      color: var(--el-text-color-primary);
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;

      .email-status {
        display: flex;
        flex: none;
        flex-direction: column;
        align-items: center;

        .del-status {
          display: flex;
        }

        @media (max-width: 1366px) {
          flex-direction: row;
          gap: 5px;
        }
      }

      .name {
        display: grid;
        flex: 1;
        min-width: 0;
        gap: 5px;
        grid-template-columns: minmax(0, max-content) auto;

        > span:last-child {
          display: flex;
          align-items: center;
        }

        @media (min-width: 1367px) {
          grid-template-columns: 1fr;
          > span:last-child {
            display: none;
          }
        }

        > span:first-child {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .name-skeleton {
          width: 150px;
          max-width: 100%;
          height: 1rem;
          @media (max-width: 767px) {
            width: 130px;
          }
        }
      }

      .phone-time {
        flex: none;
        font-weight: normal;
        font-size: 12px;
        @media (min-width: 1367px) {
          display: none;
        }
      }
    }

    .message-info {
      min-width: 0;
    }

    .email-text-skeleton {
      .text-skeleton-one {
        width: 80%;
        height: 16px;
        @media (max-width: 1366px) {
          width: 40%;
        }
        @media (max-width: 767px) {
          width: 70%;
        }
      }

      .text-skeleton-two {
        width: min(300px, 100%);
        height: 16px;
        @media (min-width: 1367px) {
          display: none;
        }
        @media (max-width: 1366px) {
          width: 100%;
        }
      }
    }

    .email-text {
      display: grid;
      grid-template-columns: fit-content(56%) minmax(0, 1fr);
      @media (max-width: 1366px) {
        grid-template-columns: minmax(0, 1fr);
      }

      .email-subject {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow: hidden;
        white-space: nowrap;
        min-width: 0;
        @media (min-width: 1367px) {
          padding-left: 5px;
        }
      }

      .code-tag {
        flex: 0 0 auto;
        max-width: 170px;
        height: 20px;
        line-height: 20px;
        font-size: 14px;
        color: var(--el-text-color-primary);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        cursor: pointer;
      }

      .subject-text {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        min-width: 0;
        color: inherit;
        font-weight: inherit;
        line-height: inherit;
        text-align: start;
        cursor: pointer;

        &:focus-visible {
          border-radius: 3px;
          outline: 2px solid var(--el-text-color-secondary);
          outline-offset: -2px;
        }
      }

      .email-content {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        padding-left: 10px;
        color: var(--email-scroll-content-color);
        @media (max-width: 1366px) {
          padding-left: 0;
          margin-top: 0;
        }
      }
    }
  }


  .email-right {
    flex: none;
    text-align: right;
    font-size: 12px;
    white-space: nowrap;
    display: flex;
    padding-left: 15px;
    align-items: center;
    @media (max-width: 1366px) {
      display: none;
    }
  }

  .email-right-skeleton {
    @media (max-width: 1366px) {
      display: none;
    }
  }

  &:hover {
    background-color: var(--email-hover-background);
    z-index: 0;
  }

  &.right-checked,
  &.right-checked:hover,
  &[data-checked="true"] {
    background-color: var(--email-right-click-background);
  }
}


.email-time {
  padding-right: v-bind(timePaddingRight);
}

:deep(.el-scrollbar__view) {
  height: 100%;
}

.header-actions {
  display: grid;
  grid-template-columns: var(--mail-shell-control) minmax(0, 1fr) auto;
  align-items: center;
  min-height: var(--mail-shell-toolbar);
  gap: var(--mail-list-control-gap);
  padding: 4px var(--mail-shell-gutter);
  border-bottom: 1px solid var(--mail-shell-line);

  .header-left {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    position: relative;
    gap: var(--mail-list-control-gap);
    color: var(--el-text-color-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;

    .email-count {
      white-space: nowrap;
    }
  }

}

.mail-register {
  --register-columns: 32px clamp(112px, 12%, 168px) minmax(0, 1fr) clamp(145px, 17%, 244px) 72px;
  --register-column-gap: 14px;
  --register-inset: 12px;
  --register-areas: "select sender message mailbox time";
  --register-row-height: 72px;

  display: flex;
  flex-direction: column;
  padding: 18px clamp(12px, 1.6vw, 24px) 0;

  .header-actions {
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas: "filters actions count" "columns columns columns";
    column-gap: 12px;
    row-gap: 14px;
    padding: 0;
    border-bottom: 0;
  }

  .header-left {
    display: contents;

    > :slotted(.all-mail-filters) {
      grid-area: filters;
    }

    > .toolbar-group {
      grid-area: actions;
    }
  }

  .header-right {
    grid-area: count;
    justify-content: flex-end;
    padding-inline-end: var(--register-inset);
    color: var(--mail-shell-muted);
    font-size: 13px;
  }

  .header-select,
  :deep(.email-row.all-email) {
    display: grid;
    grid-template-columns: var(--register-columns);
    align-items: center;
    column-gap: var(--register-column-gap);
    padding-inline: var(--register-inset);
  }

  .header-select {
    grid-area: columns;
    min-height: 38px;
    overflow: hidden;
    scrollbar-gutter: stable;
    border-block: 1px solid var(--mail-shell-line);
    border-radius: 8px 8px 0 0;
    background: var(--mail-shell-rail);
    color: var(--mail-shell-muted);
    font-size: 12px;
  }

  .register-time-label {
    text-align: end;
  }

  .scroll {
    flex: 1;
    min-height: 0;
    height: auto;
  }

  :deep(.virtual) {
    scrollbar-gutter: stable;
  }

  :deep(.email-row.all-email) {
    grid-template-areas: var(--register-areas);
    height: var(--register-row-height);
    padding-block: 8px;

    .row-select.el-checkbox {
      grid-area: select;
      margin: 0;
    }

    .title {
      display: contents;
    }

    .email-sender {
      grid-area: sender;
      gap: 8px;

      .email-status {
        flex-direction: row;
        gap: 4px;
      }

      .name {
        display: block;

        > span:first-child {
          display: block;
        }

        > span:last-child {
          display: none;
        }
      }

      .phone-time {
        display: none;
      }
    }

    .message-info {
      grid-area: message;
    }

    .email-text {
      grid-template-columns: minmax(0, 1fr);
      row-gap: 3px;

      .email-subject, .email-content {
        padding: 0;
      }

      .subject-text {
        font-weight: 500;
      }

      .email-content {
        color: var(--mail-shell-muted);
        font-size: 13px;
      }
    }

    .email-text-skeleton .text-skeleton-two {
      display: block;
      width: 58%;
    }

    .user-info {
      grid-area: mailbox;
      display: flex;
      flex-direction: column;
      gap: 3px 12px;
      min-width: 0;
      color: var(--mail-shell-muted);
      font-size: 12px;
      line-height: 16px;

      .user, .account {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      svg {
        flex: none;
      }

      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .email-right, .email-right-skeleton {
      grid-area: time;
      display: block;
      padding: 0;
      color: var(--mail-shell-muted);
      text-align: end;
      font-variant-numeric: tabular-nums;
    }

    .email-time {
      padding: 0;
    }
  }
}

.register-compact {
  --register-columns: 32px minmax(0, 1fr) minmax(48px, max-content);
  --register-column-gap: 8px;
  --register-areas: "select sender time" "select message message" "select mailbox mailbox";
  --register-row-height: 104px;

  .header-actions {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "filters filters" "actions count" "columns columns";
    row-gap: 8px;
  }

  .register-sender-label, .register-mailbox-label {
    display: none;
  }

  :deep(.email-row.all-email) {
    grid-template-rows: 20px 40px 16px;
    row-gap: 4px;

    .row-select, .email-sender, .email-right, .email-right-skeleton {
      align-self: start;
    }

    .row-select.el-checkbox {
      height: 20px;
    }

    .user-info {
      flex-direction: row;
    }
  }
}

:deep(.selection-control.el-checkbox) {
  display: flex;
  justify-content: center;
  width: var(--mail-shell-control);
  height: var(--mail-shell-control);
  margin: 0;
}

.del-status {
  color: var(--el-color-info);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  bottom: 1px;
}



.right-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread {
  height: 6px;
  width: 6px;
  background: var(--el-color-primary);
  margin-bottom: 2px;
  margin-right: 5px;
  border-radius: 50%;
  display: inline-block;
  justify-content: center;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

</style>
