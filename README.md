# S08 | AP6: exposición de servicios y configuración segura

Ejemplo funcional de dos capas para Minikube: API Node.js, MongoDB interno,
ConfigMap para configuración no sensible, Secret para credenciales y servicio
NodePort para acceder a la API.

## Arquitectura

- `backend`: consume `app-config` y las credenciales `mongo-credentials`.
- `mongo`: Deployment de MongoDB con autenticación habilitada.
- `mongo` Service: `ClusterIP`, accesible dentro del clúster en el puerto 27017.
- `backend` Service: `NodePort` 30080, expone la API en el puerto 3000.
- La API permite consultar y crear elementos en `/api/items`.
- `/health` comprueba disponibilidad de MongoDB y `/live` indica que el proceso
  de la API está activo.

> **Importante:** Base64 no cifra ni protege por sí solo un valor; solo lo codifica.
> Los valores incluidos son exclusivamente de demostración. No publiques
> credenciales reales en un repositorio público. En un entorno real, limita el
> acceso a Secrets con RBAC y considera un gestor de secretos.

## Requisitos

- Docker
- Minikube
- kubectl
- Node.js y npm (solo para ejecutar la API localmente; no son necesarios para
  construir la imagen con Minikube)

## Despliegue en Minikube

Desde la raíz del repositorio:

1. Inicia el clúster:

   ```sh
   minikube start
   ```

2. **Opcional pero recomendado:** cambia las credenciales de demostración. Genera
   Base64 para cada valor con `printf '%s' 'tu-valor' | base64`, y sustituye los
   valores de `DB_USER` y `DB_PASS` en `k8s/02-db-secret.yaml`. No uses estas
   credenciales para ningún servicio real.

3. Crea el namespace y configura los recursos:

   ```sh
   kubectl create namespace practica-s08
   kubectl apply -f k8s/
   ```

4. Construye la imagen directamente en el entorno de Minikube:

   ```sh
   minikube image build -t practica-s08-backend:1.0 .
   ```

5. Espera a que ambos Deployments estén listos:

   ```sh
   kubectl -n practica-s08 rollout status deployment/mongo
   kubectl -n practica-s08 rollout status deployment/backend
   kubectl -n practica-s08 get pods,services
   ```

6. Abre la aplicación:

   ```sh
   minikube service backend -n practica-s08 --url
   ```

   Abre la URL que imprime el comando y agrega `/health` o `/api/items`.
   En otra terminal, puedes crear un elemento:

   ```sh
   curl -X POST "$(minikube service backend -n practica-s08 --url)/api/items" \
     -H 'Content-Type: application/json' \
     -d '{"name":"primer elemento"}'
   ```

   Para listar los elementos, visita `/api/items` o ejecuta:

   ```sh
   curl "$(minikube service backend -n practica-s08 --url)/api/items"
   ```

## Verificación y solución de problemas

```sh
kubectl -n practica-s08 get all
kubectl -n practica-s08 describe pods
kubectl -n practica-s08 logs deployment/mongo
kubectl -n practica-s08 logs deployment/backend
kubectl -n practica-s08 get configmap app-config -o yaml
kubectl -n practica-s08 get secret mongo-credentials
```

Si modificas el Secret después de crear MongoDB, ten en cuenta que las variables
de inicialización `MONGO_INITDB_ROOT_USERNAME` y
`MONGO_INITDB_ROOT_PASSWORD` solo se aplican cuando MongoDB crea por primera vez
su directorio de datos. Para este laboratorio con `emptyDir`, recrea los pods
para iniciar una base limpia:

```sh
kubectl -n practica-s08 delete pod -l app=mongo
kubectl -n practica-s08 rollout status deployment/mongo
kubectl -n practica-s08 rollout restart deployment/backend
```

Los datos de MongoDB son efímeros y se pierden al recrear el pod; el manifiesto
usa `emptyDir` para mantener simple el ejercicio. Para persistencia real, usa un
PersistentVolumeClaim.

## Ejecución local opcional

Con MongoDB disponible en `localhost:27017` y las variables configuradas:

```sh
npm install
DB_HOST=localhost DB_NAME=practica DB_USER=demo_user \
DB_PASS=demo_pass_change_me APP_PORT=3000 npm start
```

## Evidencias para el documento y el video

Capturas sugeridas:

1. `kubectl get pods,services -n practica-s08` con ambos pods listos y los
   servicios `ClusterIP` y `NodePort`.
2. Los manifiestos de ConfigMap y Secret (sin revelar credenciales reales).
3. La respuesta de `/health`.
4. Una creación con `POST /api/items` y la posterior lista en `GET /api/items`.
5. `kubectl describe service backend -n practica-s08` mostrando el NodePort.

Guion breve para el video: presentar la arquitectura, aplicar los manifiestos,
mostrar los recursos y explicar ConfigMap frente a Secret, abrir `/health`,
crear/listar un elemento y cerrar indicando que Base64 no es cifrado y que
MongoDB usa almacenamiento efímero en esta demo.

Al finalizar:

```sh
kubectl delete namespace practica-s08
```
