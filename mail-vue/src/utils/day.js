import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore();
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale(settingStore.lang === 'en' ? 'en' : 'zh-cn')
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function fromNow(date) {
    const d = dayjs.utc(date).tz(timeZone);
    const now = dayjs();
    const diffSeconds = now.diff(d, 'second');
    const diffMinutes = now.diff(d, 'minute');
    const diffHours = now.diff(d, 'hour');
    const isToday = now.isSame(d, 'day');
    if (settingStore.lang === 'en') {

        if (isToday) {
            if (diffSeconds < 60) return `Just now`;
            if (diffMinutes < 60) return `${diffMinutes} min ago`;
            if (diffHours < 2) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            return d.format('hh:mm A');
        }

        if (now.subtract(1, 'day').isSame(d, 'day')) {
            return d.format('MMM D');
        }

        return d.year() === now.year()
            ? d.format('MMM D')
            : d.format('YYYY/MM/DD');


    } else {

        if (isToday) {
            if (diffSeconds < 60) return `几秒前`;
            if (diffMinutes < 60) return `${diffMinutes}分钟前`;
            if (diffHours >= 1 && diffHours < 2) return '1小时前';
            return d.format('HH:mm');
        }
        else if (now.subtract(1, 'day').isSame(d, 'day')) {
            return `昨天 ${d.format('HH:mm')}`;
        }
        else if (now.subtract(2, 'day').isSame(d, 'day')) {
            return `前天 ${d.format('HH:mm')}`;
        }
        return d.year() === now.year()
            ? d.format('M月D日')
            : d.format('YYYY/M/D');

    }

}

export function updateNow(date) {
    if (isToday) {
        if (diffSeconds < 60) return `Just now`;
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 2) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return d.format('hh:mm A');
    }
}

export function formatDetailDate(time) {
    const d = dayjs.utc(time).tz(timeZone);
    const now = dayjs();

    const isSameYear = now.year() === d.year();

    if (settingStore.lang === 'en') {
        return isSameYear
            ? d.format('ddd, MMM D, h:mm A')
            : d.format('ddd, MMM D, YYYY, h:mm A');
    } else {
        return d.format('YYYY年M月D日 ddd AH:mm');
    }
}

/* Gmail 式邮件头日期：11月9日周一 14:03（1天前） */
export function formatHeaderDate(time) {
    const d = dayjs.utc(time).tz(timeZone);
    const now = dayjs();
    const minutes = Math.max(0, now.diff(d, 'minute'));
    const hours = now.diff(d, 'hour');
    const days = now.diff(d, 'day');
    const zh = settingStore.lang !== 'en';
    const relative = minutes < 1 ? (zh ? '刚刚' : 'just now')
        : minutes < 60 ? (zh ? `${minutes}分钟前` : `${minutes} min ago`)
        : hours < 24 ? (zh ? `${hours}小时前` : `${hours} hr ago`)
        : (zh ? `${days}天前` : `${days} day${days > 1 ? 's' : ''} ago`);
    const sameYear = now.year() === d.year();
    const base = zh
        ? d.format(sameYear ? 'M月D日ddd HH:mm' : 'YYYY年M月D日ddd HH:mm')
        : d.format(sameYear ? 'ddd, MMM D, HH:mm' : 'ddd, MMM D YYYY, HH:mm');
    return { text: `${base} (${relative})`, full: formatDetailDate(time) };
}

export function tzDayjs(time) {
    return dayjs.utc(time).tz(timeZone)
}

export function toUtc(time) {
    return dayjs(time).utc()
}

export function setExtend(lang) {
    dayjs.locale(lang)
}
