resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "56.0.0"

  set {
    name  = "grafana.service.type"
    value = "LoadBalancer"
  }

  depends_on = [module.eks]
}

resource "helm_release" "loki" {
  name             = "loki-stack"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "2.10.1"

  set {
    name  = "promtail.enabled"
    value = "true"
  }

  depends_on = [helm_release.kube_prometheus_stack]
}
