<template>
  <emailScroll ref="scroll"
               :cancel-success="cancelStar"
               :star-success="addStar"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :star-add="starAdd"
               :star-cancel="starCancel"
               :email-read="emailRead"
               :show-unread="true"
               :highlight-text="emailStore.searchParams.text"
               @jump="jumpContent"
               @refresh-before="emailStore.refreshUnreadCounts()"
  >
    <template #empty>
      <div class="inbox-empty">
        <span class="inbox-empty-icon" aria-hidden="true">
          <NavigationIcon name="inbox" :size="27" />
        </span>
        <h2>{{ $t(hasSearch ? 'noMessagesFound' : 'inboxEmptyTitle') }}</h2>
        <p>{{ $t(hasSearch ? 'inboxSearchEmptyHint' : 'inboxEmptyHint') }}</p>
      </div>
    </template>
  </emailScroll>
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {useSettingStore} from "@/store/setting.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {emailList, emailDelete, emailLatest, emailRead} from "@/request/email.js";
import {starAdd, starCancel} from "@/request/star.js";
import {computed, defineOptions, onMounted, ref, watch} from "vue";
import {sleep} from "@/utils/time-utils.js";
import router from "@/router/index.js";
import { useRoute } from 'vue-router'

defineOptions({
  name: 'email'
})

const route = useRoute();
const emailStore = useEmailStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const scroll = ref({})
const hasSearch = computed(() => {
  const { text, startDate, endDate } = emailStore.searchParams
  return Boolean(text || startDate || endDate)
})
onMounted(() => {
  emailStore.emailScroll = scroll;
  latest()
})


watch(() => accountStore.currentAccountId, () => {
  scroll.value.refreshList();
})

watch(
  () => emailStore.searchParams,
  () => {
    scroll.value.refreshList()
  },
  {deep: true}
)

function jumpContent(email) {
  emailStore.openMessage(email, 'inbox')
  router.push({name: 'content', params: {mailbox: 'inbox'}})
}

const existIds = new Set();

async function latest() {
  while (true) {

    let autoRefresh = settingStore.settings.autoRefresh;
    await sleep(autoRefresh > 1 ? autoRefresh * 1000 : 3000);

    if (route.name !== 'email') {
      continue;
    }

    const searchParams = emailStore.searchParams
    if (searchParams.text || searchParams.startDate || searchParams.endDate) {
      continue
    }

    const latestId = scroll.value.latestEmail?.emailId

    if (!scroll.value.firstLoad && autoRefresh > 1) {
      try {
        const accountId = accountStore.currentAccountId
        const allReceive = scroll.value.latestEmail?.allReceive
        let list = []

        //确保发起请求时最后一个邮件是当前账号的,或者
        if (accountId === scroll.value.latestEmail?.reqAccountId) {
          list = await emailLatest(latestId, accountId, allReceive);
        }

        //确保请求回来后，账号没有切换，时间排序没有改变，全部邮件类型没变
        if (accountId === accountStore.currentAccountId && allReceive === accountStore.currentAccount.allReceive) {
          if (list.length > 0) {
            emailStore.applyFullList(list)

            for (let email of list) {
              if (accountId !== accountStore.currentAccountId || allReceive !== accountStore.currentAccount.allReceive) {
                break
              }

              email.reqAccountId = accountId;
              email.allReceive = allReceive;

              if (!existIds.has(email.emailId)) {

                existIds.add(email.emailId)
                scroll.value.addItem(email)

                await sleep(50)
              }

            }

            emailStore.refreshUnreadCounts()

          }

        }
      } catch (e) {
        if (e.code === 401 || e.code === 403) {
          settingStore.settings.autoRefresh = 0;
        }
        console.error(e)
      }
    }
  }
}

function addStar(email) {
  emailStore.starScroll?.addItem(email)
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId])
}

function getEmailList(emailId, size) {
  const accountId =  accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  return emailStore.fetchList(full =>
    emailList(accountId, allReceive, emailId, 0, size, 0, full, emailStore.searchParams)
  ).then(data => {
    data.latestEmail.reqAccountId = accountId;
    data.latestEmail.allReceive = allReceive;
    return data;
  })
}

</script>
<style>
.icon {
  cursor: pointer;
}
</style>

<style scoped>
.inbox-empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 20px;
  text-align: center;
}

.inbox-empty-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 8px;
  border: 1px solid var(--mail-shell-line);
  border-radius: 14px;
  background: var(--mail-shell-rail);
  color: var(--mail-shell-muted);
}

.inbox-empty h2 {
  font-size: 17px;
  font-weight: 650;
}

.inbox-empty p {
  color: var(--mail-shell-muted);
  font-size: 13px;
}
</style>
