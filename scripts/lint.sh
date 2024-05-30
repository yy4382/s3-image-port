eslint .
eslint_stat=$?
prettier --check .
prettier_stat=$?
nuxi typecheck
type_stat=$?

if [ "$eslint_stat" -ne 0 ]; then
  exit "$eslint_stat"
elif [ "$prettier_stat" -ne 0 ]; then
  exit "$prettier_stat"
elif [ "$type_stat" -ne 0 ]; then
  exit "$type_stat"
else
  exit 0
fi
