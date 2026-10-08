const reconciliationRequiredError = "ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED";

export function getZpayPaymentErrorCopy(error: string, orderNo: string) {
  if (error === "ZPAY_ORDER_EXPIRED" || error === "ZPAY_ORDER_CANCELLED") {
    return {
      title: error === "ZPAY_ORDER_CANCELLED" ? "订单已取消" : "付款时间已结束",
      description: error === "ZPAY_ORDER_CANCELLED"
        ? "当前订单已取消，请勿使用之前保存的二维码付款。"
        : "订单付款时间为 10 分钟，当前付款入口已关闭，请勿使用之前保存的二维码付款。",
      nextStep: `${error === "ZPAY_ORDER_EXPIRED" ? "系统会核对未付款订单并自动取消。" : ""}若已扣款，请勿重复下单，请联系客服并提供订单号：${orderNo}`,
    };
  }
  if (error === "ZPAY_PAYMENT_AFTER_CANCEL_RECONCILIATION") {
    return {
      title: "已收到付款，需要核对",
      description: "这笔订单取消后收到了付款通知。款项已记录，请勿再次支付。",
      nextStep: `请联系客服处理，并提供订单号：${orderNo}`,
    };
  }
  if (error === "ZPAY_PAYMENT_CREATION_REJECTED") {
    return {
      title: "支付单创建失败",
      description: "支付平台返回创建支付单失败，当前没有可用的付款入口。",
      nextStep: `请联系管理员检查当前支付渠道。若已扣款，请勿再次支付，并提供订单号：${orderNo}`,
    };
  }
  if (error === reconciliationRequiredError) {
    return {
      title: "支付订单需要核对",
      description: "这笔订单的支付状态尚未确认。为避免重复扣款，暂时不能重新支付。",
      nextStep: `请联系管理员核对该订单后再继续，并提供订单号：${orderNo}`,
    };
  }

  return {
    title: "暂时无法生成支付二维码",
    description: "支付平台暂未返回可用的支付二维码，请联系管理员检查支付通道后再继续。",
    nextStep: `请联系管理员核对该订单后再继续，并提供订单号：${orderNo}`,
  };
}
