const reconciliationRequiredError = "ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED";

export function getZpayPaymentErrorCopy(error: string, orderNo: string) {
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
